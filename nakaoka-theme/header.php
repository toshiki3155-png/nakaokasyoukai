<!DOCTYPE html>
<html <?php language_attributes(); ?>>

<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>
        <?php bloginfo('name'); ?> | Digital Beauty Ecosystem
    </title>
    <?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>
    <header class="site-header">
        <div class="logo">
            <a href="<?php echo home_url(); ?>">NAKAOKA CORP.</a>
        </div>
        <nav class="main-nav">
            <ul>
                <li><a href="#about">About</a></li>
                <li><a href="#business">Business</a></li>
                <li><a href="#recruit">Recruit</a></li>
                <li><a href="https://nakaoka-ec.web.app" class="shop-link" target="_blank">Online Shop</a></li>
            </ul>
        </nav>
    </header>