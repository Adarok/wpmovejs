#!/bin/bash
set -e

# Start MySQL
service mariadb start

# Wait for MySQL to be ready
echo "Waiting for MySQL to start..."
for i in {1..30}; do
    if mysqladmin ping -h localhost --silent 2>/dev/null; then
        echo "MySQL is ready"
        break
    fi
    sleep 1
done

# Create WordPress database and user
mysql -e "CREATE DATABASE IF NOT EXISTS wordpress;"
mysql -e "CREATE USER IF NOT EXISTS 'wordpress'@'localhost' IDENTIFIED BY 'wordpress';"
mysql -e "GRANT ALL PRIVILEGES ON wordpress.* TO 'wordpress'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

# Verify MySQL socket exists
echo "MySQL socket location:"
ls -la /var/run/mysqld/

# Setup SSH authorized keys if provided via environment
if [ -n "$SSH_PUBLIC_KEY" ]; then
    echo "$SSH_PUBLIC_KEY" > /var/www/.ssh/authorized_keys
    chown www-data:www-data /var/www/.ssh/authorized_keys
    chmod 600 /var/www/.ssh/authorized_keys

    # Also add to root for convenience
    echo "$SSH_PUBLIC_KEY" > /root/.ssh/authorized_keys
    chmod 600 /root/.ssh/authorized_keys
fi

# Setup SSH client config for www-data (to connect to remote)
# This allows wpmovejs to use ~/.ssh/config for SSH key
if [ -f /opt/ssh/id_ed25519 ]; then
    # Copy private key to www-data's .ssh directory
    cp /opt/ssh/id_ed25519 /var/www/.ssh/id_ed25519
    chown www-data:www-data /var/www/.ssh/id_ed25519
    chmod 600 /var/www/.ssh/id_ed25519

    # Create SSH config that uses this key for the 'remote' host
    cat > /var/www/.ssh/config << 'SSHCONFIG'
Host remote
    HostName remote
    User www-data
    Port 22
    IdentityFile ~/.ssh/id_ed25519
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
SSHCONFIG
    chown www-data:www-data /var/www/.ssh/config
    chmod 600 /var/www/.ssh/config

    # Also set up for root user (for commands run as root)
    cp /opt/ssh/id_ed25519 /root/.ssh/id_ed25519
    chmod 600 /root/.ssh/id_ed25519
    cat > /root/.ssh/config << 'SSHCONFIG'
Host remote
    HostName remote
    User www-data
    Port 22
    IdentityFile ~/.ssh/id_ed25519
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
SSHCONFIG
    chmod 600 /root/.ssh/config
fi

# Start SSH daemon
/usr/sbin/sshd

# Set proper permissions on WordPress directory
chown -R www-data:www-data /var/www/html
chmod -R 755 /var/www/html

# Create a wrapper for wp-cli with increased memory
echo '#!/bin/bash' > /usr/local/bin/wp-mem
echo 'php -d memory_limit=512M /usr/local/bin/wp "$@"' >> /usr/local/bin/wp-mem
chmod +x /usr/local/bin/wp-mem

# Install WordPress if not already installed
cd /var/www/html
if [ ! -f wp-config.php ]; then
    # Download WordPress core if not present
    if [ ! -f wp-load.php ]; then
        /usr/local/bin/wp-mem core download --allow-root || true
    fi

    # Set ownership after download
    chown -R www-data:www-data /var/www/html

    # Wait a moment to ensure MySQL socket is ready
    sleep 2

    # Create wp-config.php (use 127.0.0.1 instead of localhost to avoid socket issues)
    /usr/local/bin/wp-mem config create \
        --dbname=wordpress \
        --dbuser=wordpress \
        --dbpass=wordpress \
        --dbhost=127.0.0.1 \
        --allow-root || true

    # Install WordPress
    /usr/local/bin/wp-mem core install \
        --url="http://localhost:${WP_PORT:-80}" \
        --title="WPMoveJS E2E Test" \
        --admin_user=admin \
        --admin_password=admin \
        --admin_email=admin@example.com \
        --skip-email \
        --allow-root || true

    # Set ownership after install
    chown -R www-data:www-data /var/www/html
fi

echo "WordPress is ready!"
echo "SSH is listening on port 22"

# Keep container running
if [ "$1" = "daemon" ]; then
    # Start Apache in foreground
    apache2-foreground
else
    # Just keep running for testing
    tail -f /dev/null
fi
