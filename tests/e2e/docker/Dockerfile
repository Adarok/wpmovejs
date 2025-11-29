# WordPress with SSH, wp-cli, rsync, and MySQL for e2e testing
FROM wordpress:6.7-php8.2-apache

# Install dependencies
RUN apt-get update && apt-get install -y \
    openssh-server \
    rsync \
    sudo \
    mariadb-server \
    less \
    vim \
    curl \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 22.x
RUN mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install wp-cli
RUN curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar \
    && chmod +x wp-cli.phar \
    && mv wp-cli.phar /usr/local/bin/wp

# Configure SSH
RUN mkdir -p /var/run/sshd \
    && mkdir -p /root/.ssh \
    && chmod 700 /root/.ssh \
    && sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config \
    && sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config \
    && sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config

# Create www-data home directory for SSH
RUN mkdir -p /var/www/.ssh \
    && chown -R www-data:www-data /var/www \
    && chmod 700 /var/www/.ssh \
    && usermod -s /bin/bash www-data

# Configure MySQL to run as root (for simplicity in testing)
RUN mkdir -p /var/run/mysqld \
    && chown mysql:mysql /var/run/mysqld

# Copy entrypoint script
COPY entrypoint.sh /usr/local/bin/e2e-entrypoint.sh
RUN chmod +x /usr/local/bin/e2e-entrypoint.sh

# Expose SSH and HTTP
EXPOSE 22 80

# Use custom entrypoint
ENTRYPOINT ["/usr/local/bin/e2e-entrypoint.sh"]
