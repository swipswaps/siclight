// init ajax queue item counter
var $queue_items_total = 0;
var $queue_items_processed = 0;

// get progressbar
var $progressbar = $('#progressbar');

// initiate results array that will store all responses
var $results = [];

// intitiate the requests array
var $requests = [];

// initiate variable wich is later used to determine
// if there is a single refresh or a multiple refresh
var $single_refresh = true;


$(document).ready(function(){

    // DataTables, introduced in SIClight v1.7
    SitesDataTable = $('table.sites').DataTable({
        "paging": false, // no pagination
        "bInfo" : false, // no footer info bar
        "order" : [ 0, 'asc' ], // by first column
        language: {
            searchPlaceholder: "Search sites",
            search: "", // no "search" label
        }
    });

    // search DataTable from within external search field
    // (not generated via datatables JS)
    $('#search_sites').keyup(function(){
        SitesDataTable.search($(this).val()).draw();
    })


    // reset filter and search
    // NOTE: Resetting the UIkit filter is done via the 'uk-filter-control' element without
    // any selector (https://getuikit.com/docs/filter#reset-filter) – so we only have to take
    // care about the DataTables Search component
    $('#resetFilterAndSearch').click(function(){
        $('#search_sites').val(''); // empty external search box
        SitesDataTable.search('').draw(); // empty the (hidden) DataTable-native search box
    });

    
    // Refresh single item
    $('button.refresh').click(function(){
        // getting parent row
        $row = $(this).parent().parent();

        // adding class to parent row indicating activity
        $($row).addClass('refreshing');

        // removeing error class (if present from previous run)
        $($row).removeClass('refresh-error');

        // adding text "refreshing" to time cell
        $($row).find('td.time').text('refreshing ...');

        // adding .disable class to histroy links
        // so we can disable then via CSS
        // because clicking them will interrupt refresh queue
        $($row).find('a.history').addClass('disabled');

        // getting data for selected site
        $site_id = $($row).data('id');
        $site_name = $($row).data('name');

        // creating data array for json
        $data = {
          site_id: $site_id,
          site_name: $site_name
        };

        // instantiate object for ajax request
        var request = $.ajax ({
            url: 'connector/proxy.php',
            type: 'post',
            dataType: 'json',
            data: JSON.stringify($data),
            success: function(response){
                RefreshSuccess(response);
            },
            error: function (response) {
                RefreshError(response);
            }
        });

        // add the request object to the requests array
        // this needed because the WaitForRequestsToFinish() 
        // function (added in v1.8) holds a promis for the $requests
        $requests.push(request);

        // if this is a single refresh (no click on refresh-all or refresh-filterd)
        // we execute the WaitForRequestsToFinish() wich starts the RefreshComplete()
        // function (wich does e.g. status bar handling) and resets the $requests array;
        if($single_refresh){
            WaitForRequestsToFinish($requests);
        }

        // increase ajax queue item total counter
        $queue_items_total++;

        // set progressbar max-value
        $progressbar.attr( "max", $queue_items_total );

        // show progressbar
        $('#progress').slideDown();


    });

    // Refresh all
    $('button.refresh-all').click(function(){

        // check if there is a filter or search set,
        // or if the sort order was changed
        var $needToReset = false;
        // -- check if UIkit filter is set
        if($('ul.sites-filter li.uk-active').attr('uk-filter-control')!=''){
            $needToReset = true;
        };
        // -- check if DataTables search is set
        if($('#search_sites').val()!=""){
            $needToReset = true;
        }
        // -- check if the sort order was changed (default is [0, "asc"] wich means first column ascending)
        var $tableSortOrder = JSON.stringify(SitesDataTable.order());
        if($tableSortOrder != '[0,"asc"]'){
            $needToReset = true;
        }
        // if there is a filter or search present
        // we need to reset them
        if($needToReset){
            // reset DataTable filter
            // Source: https://datatables.net/plug-ins/api/fnFilterClear
            SitesDataTable.search( '' ).columns().search( '' ).draw();

            // reset DataTable sort 
            SitesDataTable.order( [ 0, 'asc' ] ).draw();

            // trigger click on RESET FILTER & SEARCH button
            // yes ... some of this is redundant, because the
            // DataTable search filter is already cleared a few
            // lines above – but i kept this in place for now
            $('#resetFilterAndSearch').trigger("click");

            UIkit.notification({
                message: 'Filter, search and sort order resetted',
                status: 'primary',
                pos: 'top-right',
                timeout: 1000
            });
        }

        

        // set variable to indicate the refesh all button was clicked
        // we use the window object in order to make it globally accessible
        window.refreshed_all = true;

        // set variable to indicate this is NOT a single refresh
        $single_refresh = false;

        // trigger the refresh buttons
        $('button.refresh').each(function(){
            $(this).trigger("click");
        });

        // check if all ajax requests completed
        WaitForRequestsToFinish($requests);
    });


    // Refresh filtered sites (via DataTables)
    $('button.refresh-selected').click(function(){
        // set variable to indicate this is NOT a single refresh
        $single_refresh = false;


        // only trigger visible (non-filtered) elements
        // NOTE: the "tr:visible" prefix is not necessary for DataTables
        // but for the CMS filter
        $('tr:visible button.refresh').each(function(){
            $(this).trigger("click");
        });

        // check if all ajax requests completed
        WaitForRequestsToFinish($requests);
    });




    // add number of matching sites to sites filter selector list
    $('ul.sites-filter li[data-filter-for]').each(function(){
        // what is this button for?
        var $filterFor = $(this).data('filter-for');
        
        // how many matching sites we hav
        var $filterMatches = $('tr[data-sys="'+$filterFor+'"]').length;
        //console.log($filterFor+'   '+$filterMatches);

        // add number to filter item
        $(this).find('a').append(' ('+$filterMatches+')');
    });



});




function RefreshSuccess(response){
    console.info(response['site_name']+" successfully refreshed");

    // remove "refreshing" class from table row
    $("tr[data-id="+response['site_id']+"]").removeClass('refreshing');

    // remove "recent" class from table row
    $("tr[data-id="+response['site_id']+"]>td").removeClass('recent');

    // add current date and time in the "Updated" cell
    var currentdate = new Date();
    var germandate = ('0' + currentdate.getDate()).slice(-2) + '.' + ('0' + (currentdate.getMonth()+1)).slice(-2) + '.' + currentdate.getFullYear();        
    var germantime = ('0' + (currentdate.getHours())).slice(-2) + ':' + ('0' + (currentdate.getMinutes())).slice(-2) + ':' + ('0' + (currentdate.getSeconds())).slice(-2)
    $("tr[data-id="+response['site_id']+"] td.time").text(germandate + ' @ ' + germantime);

    // add the values from response to the table cells
    $("tr[data-id="+response['site_id']+"] td.sys_ver").text(response['sys_ver']);
    $("tr[data-id="+response['site_id']+"] td.php_ver").text(response['php_ver']);
    $("tr[data-id="+response['site_id']+"] td.sat_ver").text(response['sat_ver']);

    // increase ajax queue item processed counter
    $queue_items_processed++;
    
    // update progressbar current value
    $progressbar.attr( "value", $queue_items_processed );

    // push response into $results array
    // -- but first add date and time
    response['date'] = germandate;
    response['time'] = germantime;
    $results.push(response);
};

function RefreshError(response){
    response = JSON.parse(response.responseText);
    // remove "refreshing" class from table row
    $("tr[data-id="+response['site_id']+"]").removeClass('refreshing');
    $("tr[data-id="+response['site_id']+"]").addClass('refresh-error');
    $("tr[data-id="+response['site_id']+"] td.time").html('failed <span uk-icon="icon: warning" uk-tooltip title="'+response['errortxt']+'"></span>');

    // remove "recent" class from the time cell
    $("tr[data-id="+response['site_id']+"]>td.time").removeClass('recent');

    // promt error via notification
    UIkit.notification({
        message: '<strong>'+response['site_name']+': </strong>Refresh failed<br/><small>'+response['errortxt']+'</small>',
        status: 'danger',
        pos: 'top-right',
        timeout: 5000
    });

    // also write error to console.log for debugginh
    console.warn(response['site_name']+' failed to refresh: '+response['errortxt']);

    // increase ajax queue item processed counter
    $queue_items_processed++;
    
    // update progressbar current value
    $progressbar.attr( "value", $queue_items_processed );

    // push error messages into $results array
    // because we use the $results array to create a CSV summary later
    $results.push({
        'php_ver' : 'n/a',
        'sat_ver' : 'n/a',
        'site_id' : response['site_id'],
        'site_name' : response['site_name'],
        'sys_ver': 'n/a'
    });
    
}

function RefreshComplete(response){
    UIkit.notification({
        message: 'Refresh finished.',
        status: 'success',
        pos: 'top-right',
        timeout: 5000
    });
    // write info to console
    console.info('Refresh queue finished.');

    // remove .disabled class from history links
    $('a.history').each(function(){
        $(this).removeClass('disabled');
    });

    // reset ajax queue item counter
    $queue_items_total = 0;
    $queue_items_processed = 0;
    $('#progress').delay(500).slideUp();
    setTimeout(function(){
        $progressbar.delay(1000).attr( "value", 0 );
        $progressbar.delay(1000).attr( "max", 100 );
    }, 1000);

    // submit $results to summary writer
    submitResultsToSummaryWriter();

    // update DataTable (causing e.g. re-sort with new data)
    SitesDataTable.rows().invalidate();
    SitesDataTable.draw();
}


function submitResultsToSummaryWriter(){
    // check if refresh all button was activated
    if(typeof window.refreshed_all !== 'undefined' && window.refreshed_all == true){
        //console.log($results);

        // send $results to summarywriter
        $.ajax({
            type: "POST",
            data: JSON.stringify($results),
            url: "connector/summarywriter.php",
            success: function(msg){
                // notiy that summary is available
                UIkit.notification({
                    message: '<div style="text-align:center"><h2>Summary created</h2><a class="uk-button uk-button-danger" href="history/_summary-latest.csv" target="_blank">Dowload</a></div>',
                    status: 'primary',
                    pos: 'bottom-right',
                    timeout: 15000
                });

                // show the download-summary-button in header
                $('.download-summary').removeClass('hide');
            }
        });
    }

    // reset variable to false
    window.refreshed_all = false;

    // reset results array
    $results =[];
}




function WaitForRequestsToFinish($requests){
    // Note the .map(reflect) – wich causes the reflect() function
    // to be applied on each elements in the $requests array.
    // The reflect() function in turn causes Promise.all to be
    // fullfilled even if there was an error (wich would Promise.all
    // to not trigger usually)
    // See definition of reflect() function for source of this solution.
    Promise.all($requests.map(reflect)).then(response => {
        // call function when all request completed
        RefreshComplete(response); 
        
        // reset requests array
        $requests = [];

        // reset variable to false
        $single_refresh = true;
    });
}


/* A helper function used in WaitForRequestsToFinish() Promis.all
 * in order to execute the RefreshComplete() function and the resets
 * even if there was an error during satellite fetching.
 * Source: https://stackoverflow.com/questions/31424561/wait-until-all-es6-promises-complete-even-rejected-promises/31424853#31424853
 */
function reflect(promise) {
    return promise.then(function (v) { return { v: v, status: "resolved" } },
        function (e) { return { e: e, status: "rejected" } });
}