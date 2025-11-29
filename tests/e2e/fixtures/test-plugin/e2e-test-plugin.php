<?php
/**
 * Plugin Name: E2E Test Plugin
 * Description: A simple plugin for e2e testing
 * Version: 1.0.0
 * Author: WPMoveJS E2E Tests
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Simple functionality for testing
add_action('init', function() {
    // Register a simple option to verify the plugin was synced
    if (!get_option('e2e_test_plugin_installed')) {
        update_option('e2e_test_plugin_installed', time());
    }
});

// Add admin notice to confirm plugin is active
add_action('admin_notices', function() {
    echo '<div class="notice notice-success"><p>E2E Test Plugin is active!</p></div>';
});
