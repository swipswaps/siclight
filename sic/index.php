<?php
/* Site Info Center LIGHT (SIC LIGHT)
 * author: André Herdling (andreherdling.de)
 *
 * see CHANGELOG.md for changes history
 * */



ini_set('display_errors', 'On');
error_reporting(E_ALL);


$siclight_version = "1.9";

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Site Info Center Light</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="css/uikit.min.css" />
    <link rel="stylesheet" href="css/sic_light.css" />
</head>
<body>

    <div class="uk-container">

        <h1>Site Info Center LIGHT <small><?=$siclight_version?></small></h1>

        <?php
            if(!file_exists('sites-config.php')){
                echo "
                <div uk-alert class='uk-alert-danger'>
                    <strong>sites-config.php not found!</strong> In order to create this file, just rename the sites-config.NEW.php
                </div>\n";
            } else {
                require_once 'sites-config.php';
                require_once 'includes/functions.php';

                // get active sites table (HTML) and count
                $ActiveSites = ActiveSitesTable($sites);

                // check if a summary file exists in order
                // to show / hide the download-summary-button
                if(file_exists('history/_summary-latest.csv')){
                    $dl_sum_class = 'show';
                } else {
                    $dl_sum_class = 'hide';
                }

                // refresh all / refresh selected button markup
                if($ActiveSites['count']>0){
                    $refresh_all_btn = "<button class='refresh-all uk-button uk-button-danger' type='button' uk-tooltip title='Refresh all active sites'><span uk-icon='icon: refresh'></span> ALL</button>\n";
                    $refresh_selected_btn = "<button class='refresh-selected uk-button uk-button-primary' type='button' uk-tooltip title='Refresh filtered sites'><span uk-icon='icon: refresh'></span> FILTERED</button>\n";
                } else {
                    $refresh_all_btn = "";
                    $refresh_selected_btn = "";
                }


                echo "
                <div class='uk-card uk-card-default'>
                    <div class='uk-card-header'>
                        <div uk-grid class='uk-child-width-expand'>
                            <div>
                                <h2 class='uk-card-title'>Active Sites <span class='uk-badge'>".$ActiveSites['count']."</span></h2>
                            </div>
                            <div class='header-left'>
                                {$refresh_selected_btn}
                                {$refresh_all_btn}
                                <a href='history/_summary-latest.csv' target='blank' class='uk-button uk-button-default download-summary {$dl_sum_class}' uk-tooltip title='Download latest summary CSV'><span uk-icon='icon: download'></span> CSV</a>
                            </div>
                        </div>
                    </div>
                    <div class='uk-card-body'>
                        ".$ActiveSites['table']."
                    </div>
                </div>\n";
                
                echo InactiveSites($sites);   
            }
        ?>

    </div>
 
    <div class="licenses">
        SIC LIGHT <?php echo $siclight_version; ?> by <a href="https://www.andreherdling.de">André Herdling</a> | <a href="licenses.txt">Licenses &amp; used software</a>
    </div>

    <div id="progress">
        <progress id="progressbar" class="uk-progress" value="0" max="100"></progress>
    </div>

    <script src="js/jquery-3.1.1.min.js"></script>
    <script src="js/uikit.min.js"></script>
    <script src="js/uikit-icons.min.js"></script>
    <script src="js/datatables.min.js"></script>
    <script src="js/main.js"></script>
    
</body>
</html>
