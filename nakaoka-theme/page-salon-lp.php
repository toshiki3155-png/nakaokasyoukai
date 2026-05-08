<?php
/**
 * Template Name: Salon LP (Smartphone Rich)
 * Description: High-conversion "Drop-in" template with Bento Grid layout.
 */
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>

<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>
        <?php the_title(); ?> | Premium Salon
    </title>
    <!-- Direct link to LP-specific CSS (bypassing main theme if needed, though functions.php handles it too) -->
    <?php wp_head(); ?>
</head>

<body class="salon-lp-body">

    <!-- Mobile-First Header -->
    <header class="lp-header">
        <div class="lp-logo">Salon BRAND</div>
        <a href="#reserve" class="lp-reserve-btn-sm">Reserve</a>
    </header>

    <main class="lp-container">
        <!-- Hero: Bento Grid Item 1 -->
        <section class="bento-hero">
            <h1>New Style<br>2026</h1>
            <p>Men's Straightening Specialist</p>
        </section>

        <!-- Menu: Bento Grid -->
        <section class="bento-grid">
            <div class="bento-card menu-item">
                <h3>Cut + Color</h3>
                <p>¥12,000</p>
            </div>
            <div class="bento-card menu-item">
                <h3>Straightening</h3>
                <p>¥15,000</p>
            </div>
            <div class="bento-card access-item">
                <h3>Access</h3>
                <p>3 min from Ginza St.</p>
            </div>
        </section>

        <!-- Google Review Bridge -->
        <section class="review-bridge">
            <h2>Customer Voice</h2>
            <div class="review-box">
                <p>★★★★★ "The atmosphere was amazing and the cut was perfect."</p>
                <button onclick="copyAndRedirect()" class="google-copy-btn">Copy & Write Review</button>
            </div>
        </section>
    </main>

    <!-- Sticky Footer -->
    <div class="sticky-footer">
        <a href="https://beauty.hotpepper.jp/PLACEHOLDER" class="reserve-now-btn">Book Appointment Now</a>
    </div>

    <!-- Simple JS for Review Bridge -->
    <script>
        function copyAndRedirect() {
            const text = "The atmosphere was amazing and the cut was perfect.";
            navigator.clipboard.writeText(text).then(() => {
                alert("Review copied! Opening Google Maps...");
                window.location.href = "https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID";
            });
        }
    </script>

    <?php wp_footer(); ?>
</body>

</html>