<?php
$app_id = '000000000000000';
$app_namespace = 'wheretheynow';
?>
<!DOCTYPE html>
<html>
<head>
<title>Where are they now - Your friends current locations on a map</title>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta property="fb:app_id" content="<?php echo $app_id ?>"/>
<meta property="fb:admins" content="503862563" />
<meta property="og:url" content="https://facebook.holisticsystems.co.uk/wheretheynow/"/>
<meta property="og:type" content="website"/>
<meta property="og:image" content="https://facebook.holisticsystems.co.uk/wheretheynow/images/icon_1024.png"/>
<meta property="og:title" content="Where are they now"/>
<meta property="og:description" content="Quickly and simply display the currently published locations of all your friends."/>


<script src="//ajax.googleapis.com/ajax/libs/jquery/2.0.0/jquery.min.js"></script>
<script src="//cdnjs.cloudflare.com/ajax/libs/async/1.22/async.min.js"></script>
<script src="//maps.googleapis.com/maps/api/js?key=AIzaSyBfzCNWLzKA7t4pUXOPNh06WrX-0lwGUE4&sensor=true"></script>
<?php
if ($_SERVER["REMOTE_ADDR"] == '89.213.26.67') {
  $admin = true;
  print '<script src="script_notmin.js"></script>';
} else {
  $admin = false;
  print '<script src="script.min.js"></script>';
}
?>


<script>
  //google analytics
  var _gaq = _gaq || [];
  _gaq.push(['_setAccount', 'UA-00000000-0']);
  _gaq.push(['_trackPageview']);

  (function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
  })();
</script>

<style type="text/css">
    html { height: 100% }
    body { height: 100%; margin: 0; padding: 0; font-family:tahoma, verdana, sans-serif; }
    #content {height:95%; width:100%; clear:both;}
    #map-canvas { height:100%; width:100%;}
    #controls {margin:4px 0 2px 0; xfloat:left; background:#fff;}
    #controls:after {content:"", clear:both;}
    .fb-like {
      margin:2px 10px 4px 10px;
      float:right;
    }
    #hide_controls {display:none;}

    #show_controls {display:none;}

    .fb-like {xmargin-top:15px;}

    label {font-weight:bold; font-size:80%; font-color:#446; margin-left:15px;}
    #auth_button, #loading, #advmode_enabled {
      display:none; z-index:1000;
      width:380px; height:180px; padding:1em;
      background:#fff; position:absolute; top:35%; left:35%;
      border:3px solid #425F9C; -webkit-border-radius:5px; -moz-border-radius:5px;
    }
    #advmode_enabled {
      display:none; z-index:1000;
      width:380px; height:30px; padding:1em;
      background:#fff; position:absolute; top:20%; left:35%;
      border:3px solid #425F9C; -webkit-border-radius:5px; -moz-border-radius:5px;
    }
    #auth_button .update {
      display:none;
    }
    button {background:#425F9C; color:#fff; font-weight:bold; font-family:Helvetica, Arial, 'lucida grande',tahoma,verdana,arial,sans-serif; padding:4px 10px; border:2px color #425F9C; -webkit-border-radius:5px; -moz-border-radius:5px;}
    h2 {font-size:120%; color:#224; margin-top:0;}
    p {font-size:80%; color:#446;}
    .profile_window {padding:0.5em;}
    .profile_window a {text-decoration:none; color:#222; font-weight:bold !important; }
    .profile_window .field { display:block;}
    .profile_window .name {margin-bottom:3px;}
    .invis {display:none;}

    .filter {display:block; float:left; white-space:nowrap;}
    #taxonomy_filter {position:relative; clear:both; margin-left:1}
    #taxonomy_filter>label {float:left; width:80px; margin-top:3px;}
    #taxonomy_filter .overlay {position:absolute; top:0px; left:0px; z-index:10;  width:100%; height:100%;}
    #fake_taxonomy {width:200px; height:24px; display:inline-block;}
    #taxonomy_filter select {width:100%;}
    #taxonomy {min-width:200px; max-width:500px; max-height:400px; overflow-y:scroll; overflow-x:hidden; background:#fff; position:absolute; top:20px; left:95px; display:none; z-index:100; font-size:80%; border:1px solid #A9A9A9; background-color:#f8f8f8; padding: 2px 2px 3px 2px;}
    #taxonomy>ul {margin:0; padding:0;}
    #taxonomy>ul label {font-weight:normal; font-size:100%; margin-left:5px;}
    #taxonomy>ul>li {padding-left:3px; cursor:pointer;}
    #taxonomy>ul>li .checklist li a {text-decoration:none; color:#222; font-size:90%;}
    #taxonomy>ul>li .checklist li a:hover:after {content:'x'; color:red; margin-left:5px; font-weight:bold;}
    #taxonomy>ul>li .title:before {content:"\27a4"; padding-right:4px;}
    #taxonomy>ul>li input {vertical-align:middle;}
    #taxonomy>ul>li>ul {display:none; list-style:none; margin:0; padding:0;}
    #taxonomy>ul>li.open>ul {display:block;}

    #no_location_wrapper {position:relative; margin-left:30px; clear:both;}
    .advanced_mode #no_location_wrapper {clear:none;}
    #fake_no_location{width:285px; height:24px; display:inline-block;}
    #no_location_wrapper .overlay {position:absolute; top:0px; left:0px; z-index:10;  width:100%; height:100%;}
    #no_location {min-width:200px; max-width:500px; max-height:400px; overflow-y:scroll; overflow-x:hidden; background:#fff; position:absolute; top:20px; left:0px; display:none; z-index:100; font-size:80%; border:1px solid #A9A9A9; background-color:#f8f8f8; padding: 2px 2px 3px 2px;}
    #no_location_wrapper select {width:100%;}
    #no_location>ul {margin:0; padding:0 5px;}
    #no_location>ul a {text-decoration:none; color:#222; font-size:90%;}
    #no_location>ul a:hover:after {content:'\279c'; color:green; margin-left:5px; font-weight:bold;}

    #advmode_filter input {vertical-align:middle;}
    #advmode_filter label {}

    #footer {position:fixed; bottom:0px; height:15px; background:#fff; z-index:10; width:100%; border-top:2px solid #111; font-size:70%; padding:3px 10px 2px 10px;}
    #footer a {text-decoration:none; color:#222;}
    #footer a:hover {text-decoration:underline;}
    .menu {margin:0; padding:0; float:right;}
    .menu LI {float:left; margin-right:30px;}

    @media screen and (max-width: 600px) {
      #controls {display:none; position:absolute; z-index:9; height:100%;}
      #controls label {display:block; margin:15px 0 0 5px;}
      #controls select {max-width:100%}
      #taxonomy_filter>label {float:none;}
      #footer {display:none; z-index:10;}
      .fb-like {margin:5px 0 5px 20px; float:left; max-width:50%;}
      #hide_controls {display:block; float:right; margin-right:10px;}
      #show_controls {display:block; float:right; margin-right:10px;}
      #auth_button, #loading {
        max-width:80%; max-height:100%;
        left:10%; top:10%;
      }
      .filter {clear:both;}
      #no_location_wrapper {clear:both; margin:15px 0 0 0px;}
    }

</style>
</head>
<body>

  <div id="fb-root"></div>
  <script>
  $(document).ready(function() {
    $.ajaxSetup({ cache: true });
    if (app_init) app_init();
    $.getScript('//connect.facebook.net/en_UK/all.js', function(){
      FB.init({
        appId: '<?php echo $app_id ?>',
        status:true,
        xfbml:true,
        version:'v2.0'
      });
      fb_init_get_data(); // will be ignored if the user is not authorised
    });
  });
  </script>
  <p class="invis">Quickly and simply display the currently published locations of all your friends. Shows current location, current address and home town depending on the privacy settings of your friends. Allows filtering of friends by sex and relationship status.</p>
  <div id="auth_button">
   <h2>Where are they now</h2>
   <p class="new">requires authorisation from Facebook to access your data.</p>
   <p class="update">requires additional authorisation from Facebook as a result of a software update.</p>
   <button onclick="fb_authorise();">Continue</button>
   <p>you will be redirected to the Facebook authorisation screen. This is perfectly safe, we do not store or do anything untoward with your data.</p>
  </div>

  <div id="loading">
    <h2>Where are they now</h2>
    <p>Loading data from facebook ...</p>
    <p><img src="images/ajax-loader.gif" /></p>
    <p>If you like this app, please help support future development by clicking Like or Share in the top right corner.</p>
  </div>

  <div id="advmode_enabled">
    <h2>Advanced Mode Enabled ...</h2>
  </div>

   <div id="controls">
     <span class="filter">
       <label for="which_location">Show</label>
       <select id="which_location" onchange="map_update();">
         <option value="current_location">Current location</option>
         <option value="current_address">Current Address</option>
         <option value="hometown_location">Home town</option>
       </select>
     </span>

    <span class="filter">
       <label for="sex">Sex</label>
       <select id="sex" onchange="map_update();">
         <option value="Any">Any</option>
       </select>
    </span>
     <span class="filter">
       <label for="status">Status</label>
       <select id="status" onchange="map_update();">
         <option value="Any">Any</option>
       </select>
    </span>
     <!--<label for="online">Online now</label>
     <select id="online" onchange="map_update();">
       <option value="Any">Any</option>
       <option value="online">Yes</option>
       <option value="offline">No</option>
     </select>-->

     <!--<label for="sports">Sports</label>
     <select id="sports" onchange="map_update();">
       <option value="Any">Any</option>
     </select>-->

    <span class="filter">
     <label for="list">List</label>
     <select id="list" onchange="map_update();">
       <option value="Any">Any</option>
     </select>
    </span>

    <span id="taxonomy_filter" class="filter">
     <label for="fake_select">Interests</label>
     <div id="fake_taxonomy">
      <select id="fake_select" onfocus="$('#taxonomy').show();" onblur="$('#taxonomy').hide();">
       <option value="Any">Any</option>
      </select>
      <div class="overlay" onclick="toggle_taxonomy();"></div>
     </div>
     <div id="taxonomy"><ul></ul></div>
    </span>

    <span id="no_location_wrapper" class="filter">
     <div id="fake_no_location">
      <select id="fake_select2" onfocus="$('#no_location').toggle();" onblur="$('#no_location').toggle();"><option></option></select>
      <div class="overlay" onclick="$('#no_location').toggle();"></div>
     </div>
     <div id="no_location"><ul></ul></div>
    </span>

    <span id="advmode_filter" class="filter">
      <label for="advanced_mode">Advanced Mode</label><input type="checkbox" id="advmode" onchange="advanced_mode_set($(this).is(':checked'), true);" />
    </span>

    <input id="hide_controls" type="button" value="Map" onclick="toggle_controls()" />

   </div>

  <div class="fb-like" data-href="https://apps.facebook.com/wheretheynow/" data-layout="button_count" data-action="like" data-show-faces="false" data-share="true"></div>

<?php
if ($admin) {
?>
  <div id="show_controls"><input type="button" value="settings" onclick="toggle_controls();" /></div>
<?php
}
?>


  <div id="content">
    <div id="map-canvas"/>
  </div>

<script>
var map, mapOptions;
function initialize() {
  mapOptions = {
    center: new google.maps.LatLng(51.4791, 0),
    zoom: 2
  };
  map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
}
google.maps.event.addDomListener(window, 'load', initialize);

var infowindow = new google.maps.InfoWindow({maxWidth:300});

</script>

<div id="footer">
  <ul class="menu">
    <li><a href="https://www.facebook.com/wheretheynow" target="_blank">Discuss this app</a></li>
    <li><a href="terms.html" target="_blank">Terms & Conditions</a></li>
    <li><a href="privacy-policy.html" target="_blank">Privacy Policy</a></li>
  </ul>
  <a href="http://holisticsystems.co.uk" target="_blank">&copy; Holistic Systems 2014</a>
</div>

  </body>
</html>
