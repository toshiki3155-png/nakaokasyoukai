<?php
/**
 * Nakaoka Theme Functions
 */

function nakaoka_enqueue_assets() {
    // 1. Google Fonts (Noto Serif JP & Outfit)
    wp_enqueue_style('google-fonts', 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@400;600&family=Outfit:wght@300;500&display=swap', array(), null);

    // 2. Main Corporate Styles (Wholesaler Strategy)
    wp_enqueue_style('nakaoka-main', get_template_directory_uri() . '/assets/css/main.css', array(), '1.0.0');

    // 3. Conditional: Salon LP Styles
    // Only load the heavy 'Smartphone Rich' styles on the specific template to keep the main site lean.
    if (is_page_template('page-salon-lp.php')) {
        wp_enqueue_style('nakaoka-salon-lp', get_template_directory_uri() . '/assets/css/salon-lp.css', array(), '1.0.0');
    }
}
add_action('wp_enqueue_scripts', 'nakaoka_enqueue_assets');

// Add support for thumbnails/featured images
add_theme_support('post-thumbnails');
