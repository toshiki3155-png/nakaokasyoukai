<?php get_header(); ?>

<main>
    <!-- Hero Section: "Dark Navy & Gold" Authority -->
    <section class="hero-section">
        <div class="hero-content">
            <h1>Elevating Beauty.</h1>
            <p>The Standard of Professional Beauty Supply.</p>
        </div>
    </section>

    <!-- News Loop: Dynamic B2B Updates -->
    <section id="news" class="news-section">
        <h2>Corporate News</h2>
        <ul class="news-list">
            <?php
            // Custom Loop as defined in Master Strategy Guide
            $news_query = new WP_Query(array(
                'post_type' => 'post',
                'posts_per_page' => 3
            ));

            if ($news_query->have_posts()):
                while ($news_query->have_posts()):
                    $news_query->the_post();
                    ?>
                    <li class="news-item">
                        <a href="<?php the_permalink(); ?>">
                            <time datetime="<?php echo get_the_date('Y-m-d'); ?>">
                                <?php echo get_the_date('Y.m.d'); ?>
                            </time>
                            <span class="news-title">
                                <?php the_title(); ?>
                            </span>
                        </a>
                    </li>
                <?php
                endwhile;
                wp_reset_postdata();
            else:
                ?>
                <li class="news-item">No recent updates.</li>
            <?php endif; ?>
        </ul>
    </section>

    <!-- Split-Layout Business Section -->
    <section id="business" class="business-section">
        <div class="split-container">
            <div class="split-left">
                <h3>Our Business</h3>
            </div>
            <div class="split-right">
                <div class="business-card">
                    <h4>Wholesale</h4>
                    <p>Supporting 500+ salons with premium logistics.</p>
                </div>
                <div class="business-card">
                    <h4>Studio & Education</h4>
                    <p>Training the next generation of stylists.</p>
                </div>
            </div>
        </div>
    </section>
</main>

<?php get_footer(); ?>