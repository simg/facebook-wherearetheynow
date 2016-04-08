
function app_init() {
  advanced_mode_set(settings.get("advmode", "false") == "true" ? true:false); //settings.get always returns a string value TODO: do this better
}


var uid, accessToken;
function updateStatusCallback(response) {
  console.log("response from fb login", response);
  if (response.status === 'connected') {
    // the user is logged in and has authenticated your app, and response.authResponse supplies the user's ID, a valid access token, a signed request, and the time the access token and signed request each expire
    uid = response.authResponse.userID;
    accessToken = response.authResponse.accessToken;
     FB.api('/v2.0/me', function(response) {
       console.log("fb_user",response.name + "-" +uid);
       _gaq.push(['_trackEvent', 'wheretheynow', 'loggedin', response.name + "-" +uid]);
     });
    $('#auth_button').hide();
    async.series([
      fb_check_permissions,
      fb_get_data
    ]);
  } else if (response.status === 'not_authorized') {
    $('#auth_button').show();
  } else {
    // the user isn't logged in to Facebook.
  }
  //fb_authorise(); // keep this here whilst in development mode so that add new permissions are re-added
}
var basic_permissions = {
  scope: 'user_friends, user_hometown, user_location, friends_hometown, friends_location, friends_relationships, read_friendlists, friends_online_presence'
};
var advanced_permissions = {
  scope: 'friends_activities, friends_about_me, friends_activities, friends_interests, friends_religion_politics, friends_work_history, friends_likes,  friends_relationship_details'
}
var permissions = {scope:basic_permissions.scope}; //TODO: refactor so that this set in more logical order

function fb_authorise() {
  if (advanced_mode) {
    permissions.scope = basic_permissions.scope + ', '+advanced_permissions.scope; //todo - make this work for real 
  } else {
    permissions.scope = basic_permissions.scope; //force this to be a string rather than a reference
  }
  
  FB.login(function(response) {
    console.log("login response", response);
   if (response.authResponse) {
     console.log('Welcome!  Fetching your information.... ');
     fb_init_get_data();
   } else {
     console.log('User cancelled login or did not fully authorize.');
   }
  }, permissions); //, friends_interests, friends_activities
}


function fb_init_get_data() {
  
  //set / reset global variables //TODO: refactor to get rid of globals :)
  mapTitlesToFields = {}; //used to re-create the link from titles to fields; //todo -refactor so more obvious what this does
  counts = {
    locations:{
      current_location:0,
      current_address:0,
      hometown_location:0
    },
    sex:{},
    relationship_status:{},
    taxonomy:{},
    online:{
      yes:0,
      no:0,
    },
    hidden_friends:[] //list of friends that can't be shown because they don't have a location
  };
  data = {};
  friendlists = {};
  friendsinfriendlists = {};
  
  //reset the select boxes (won't need to do this in the refactored version)
  $("#controls select:not(#which_location) option:not(:first-child)").remove();
  $("#taxonomy>ul>li").remove();
  
  FB.getLoginStatus(updateStatusCallback); 
}

function fb_check_permissions(next) {
  //get friendslists
  console.log("fb_check_permissions");
  
  //todo: this should be refactored to some common area //this block of code here as a hack to fix short term bug
  if (advanced_mode) {
    permissions.scope = basic_permissions.scope + ', '+advanced_permissions.scope; //todo - make this work for real 
  } else {
    permissions.scope = basic_permissions.scope; //force this to be a string rather than a reference
  }  
  var fqlRequest = "SELECT "+permissions.scope+" FROM permissions WHERE uid=me()";
  console.log(fqlRequest);
  var permission_needed = false; // default
  FB.api("/v2.0/fql",{q:fqlRequest,access_token:accessToken}, function(response){
      console.log(response);
      for (var d in response.data[0]) {
        var permission = response.data[0][d];
        console.log("permission", permission);
        if (!permission) {
         permission_needed = true;
         break; 
        }
      }
      console.log("permission_needed",permission_needed);
      if (permission_needed) {
        $("#auth_button .new").hide();
        $("#auth_button .update").show();
        $("#auth_button").show();
      } else {
        next(); 
      }      
  });
}

function fb_get_data() {
  
  $("#loading").show();
  //get friends details
  if (advanced_mode) {
    var fqlRequest = "select uid, name, pic_square, activities, affiliations, books, current_address, current_location, education, hometown_location, inspirational_people, interests, languages, meeting_for, meeting_sex, movies, music, online_presence, political, profile_url, relationship_status, religion, sex, sports, tv, work from user where uid in (select uid2 from friend where uid1 = me())";
  } else {
    var fqlRequest = "select uid, name, pic_square, current_location, current_address, hometown_location, relationship_status, sex, profile_url from user where uid in (select uid2 from friend where uid1 = me())";
  }
  FB.api("/v2.0/fql",{q:fqlRequest,access_token:accessToken}, function(response){
      console.log(response);
      data = response.data;
      map_process_data();
      map_update();
  });
  
  //get friendslists
  var fqlRequest = "select count, flid, name, type from friendlist where owner = me()";
  FB.api("/v2.0/fql",{q:fqlRequest,access_token:accessToken}, function(response){
      console.log(response);
      friendlists= response.data;
      var options =$("#list");
      for (var l in friendlists) {
        var list = friendlists[l];
        $(options).append("<option value=\""+list.flid+"\">"+list.name+ " - "+list.count+"</option>");
      }
  });
  
  //get friends in friendslists
  var fqlRequest = "select flid, uid from friendlist_member where flid in (select flid from friendlist  where owner = me())";
  FB.api("/v2.0/fql",{q:fqlRequest,access_token:accessToken}, function(response){
      console.log(response);
      for (var d in response.data) {
        var data = response.data[d];
        if (!friendsinfriendlists[""+data.flid]) {
          friendsinfriendlists[""+data.flid] = {};
        }
        friendsinfriendlists[""+data.flid][""+data.uid] = 1;
      }
      console.log("fifl",friendsinfriendlists);
  });
  
}

//returns a pointer to a value buried at a lower level in any array / object hierarchy
function getSubField(ary, ary_field_name) {
  if (!ary) return "Doesn't say";
  if (ary_field_name.length == 1) {
    return ary[ary_field_name[0]];  
  } else {
    var sub_field_name = ary_field_name[0];
    //delete ary_field_name[0];
    ary_field_name = ary_field_name.splice(1,99); //remove the first element of the array
    return getSubField(ary[sub_field_name], ary_field_name);
  }
}

//sets a value in a lower level array / object hierarchy, creating parent elements as necessary
function setSubField(ary, ary_field_name, value) {
  //if (!ary) return "Doesn't say";
  if (ary_field_name.length == 1) {
    ary[ary_field_name[0]] = value;  
  } else {
    var sub_field_name = ary_field_name[0];
    if (!ary[sub_field_name]) ary[sub_field_name] = {}; //crate sub-parent if it doesn't exist already
    //delete ary_field_name[0];
    ary_field_name = ary_field_name.splice(1,99);//remove the first element of the array
    setSubField(ary[sub_field_name], ary_field_name, value);
  }      
}

function addStringtoTaxonomy(title, friend, field_name) {
  mapTitlesToFields[title] = {type:"string", field_name:field_name};
  //console.log(title);
  if (friend[field_name] != null && friend[field_name] != undefined && friend[field_name].length > 0) {
    friend[field_name] = friend[field_name].split(',');
  } else {
    friend[field_name] = ["Doesn't say"];
  }
  
  if (!counts.taxonomy[title]) counts.taxonomy[title] = {}; //create child object for this taxonomy item
  //console.log(taxonomy);
  for (var i in friend[field_name]) {
    //console.log(string_field[i]);
    if (!counts.taxonomy[title][friend[field_name][i]]) counts.taxonomy[title][friend[field_name][i]] = 0; 
    counts.taxonomy[title][friend[field_name][i]]++;     
  }
}


function addArraytoTaxonomy(title, friend, field_name, sub_field) {
  //console.log(title);   
  mapTitlesToFields[title] = {type:"array", field_name:field_name, sub_field:sub_field};
  if (friend[field_name] == null || friend[field_name] == undefined || friend[field_name].length == 0) {
    if (sub_field) {
      friend[field_name] = [{}]
      setSubField(friend[field_name][0], sub_field.split('.'), "Doesn't say");
    } else {
      friend[field_name] = ["Doesn't say"]; 
    }
  }      
  if (!counts.taxonomy[title]) counts.taxonomy[title] = {}; //create child object for this taxonomy item
  for (var i in friend[field_name]) {
    //console.log(ary[i], ary_field);
    if (sub_field) {
      var value = getSubField(friend[field_name][i], sub_field.split('.'));
    } else {
      var value = friend[field_name][i];
    }
    if (!counts.taxonomy[title][value]) counts.taxonomy[title][value] = 0; 
    counts.taxonomy[title][value]++;     
  } 
}

function map_process_data() {
  $("#loading").hide();
  var friend;
  
  function renderInfoWindow(friend) {
    var h = '<div class="profile_window"><a href="'+friend.profile_url+'" target="_blank" title="click to visit profile">';
    h += '<span class="field name">'+friend.name+'</span>';
    h += '<span class="field pic"><img src="'+friend.pic_square+'" /></span>';
    h += '</a></div>';
    return h;
  }
  
  /*function resizeInfoWindow(infowindow) {
    $(".profile_window .name")[0].prop('scrollWidth');
  }*/
  
  for(var f in data) {
    friend = data[f];
    if (friend.current_location) {
      counts.locations.current_location++;
      friend.current_location.marker = new google.maps.Marker({
        icon:"https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        position: new google.maps.LatLng(friend.current_location.latitude,friend.current_location.longitude),
        title:friend.name
      });
      google.maps.event.addListener(friend.current_location.marker, 'click', function(friend) {
        return function() {
          infowindow.setContent(renderInfoWindow(friend))
          infowindow.open(map, friend.current_location.marker); 
        }
      }(friend));
    }
    if (friend.current_address) {
      counts.locations.current_address++;
      friend.current_address.marker = new google.maps.Marker({
        icon:"https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        position: new google.maps.LatLng(friend.current_address.latitude,friend.current_address.longitude),
        title:friend.name
      });
      google.maps.event.addListener(friend.current_address.marker, 'click', function(friend) {
        return function() {
          infowindow.setContent(renderInfoWindow(friend))
          infowindow.open(map, friend.current_address.marker); 
        }
      }(friend));     
    }
    if (friend.hometown_location) {
      counts.locations.hometown_location++;
      friend.hometown_location.marker = new google.maps.Marker({
        icon:"https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        position: new google.maps.LatLng(friend.hometown_location.latitude,friend.hometown_location.longitude),
        title:friend.name
      });
      google.maps.event.addListener(friend.hometown_location.marker, 'click', function(friend) {
        return function() {
          infowindow.setContent(renderInfoWindow(friend))
          infowindow.open(map, friend.hometown_location.marker); 
        }
      }(friend));
    }
    
    //count sexes
    if (friend.sex == null || friend.sex == "") {
      friend.sex = "Doesn't say";
    }
    if (!counts.sex[friend.sex]) counts.sex[friend.sex] = 0; 
    counts.sex[friend.sex]++;
    
    //count relationship statuses
    if (friend.relationship_status == null || friend.relationship_status == "") {
      friend.relationship_status = "Doesn't say";
    }
    if (!counts.relationship_status[friend.relationship_status]) counts.relationship_status[friend.relationship_status] = 0; 
    counts.relationship_status[friend.relationship_status]++;
    
    /*if (friend.online_presence == "online") {
      counts.online.yes++;
    } else {
      counts.online.no++;
    }*/
    if (advanced_mode) {
      addStringtoTaxonomy("Activities", friend, "activities");
      //addArraytoTaxonomy("Networks", friend.affiliations, "name");
      addStringtoTaxonomy("Books", friend, "books");
      addArraytoTaxonomy("School", friend, "education", "school.name");
      addArraytoTaxonomy("Degree", friend, "education", "degree.name");
      addArraytoTaxonomy("Inspirational People", friend, "inspirational_people", "name");
      addStringtoTaxonomy("Interests", friend, "interests");
      addArraytoTaxonomy("Languages", friend, "languages", "name");
      addArraytoTaxonomy("Meeting for", friend, "meeting_for");
      addArraytoTaxonomy("Meeting sex", friend, "meeting_sex");
      addStringtoTaxonomy("Movies", friend, "movies");
      addStringtoTaxonomy("Music", friend, "music");
      addStringtoTaxonomy("Political", friend, "political");
      addStringtoTaxonomy("Religion", friend, "religion");
      addArraytoTaxonomy("Sports", friend, "sports", "name");
      addStringtoTaxonomy("TV", friend, "tv");
      addArraytoTaxonomy("Company", friend, "work", "employer.name");
      addArraytoTaxonomy("Job Role", friend, "work", "position.name");
    }
             
  }
  var options = $("#which_location option");
  $(options[0]).text("Current location - " + counts.locations.current_location);
  $(options[1]).text("Current Address - " + counts.locations.current_address);
  $(options[2]).text("Home town - " + counts.locations.hometown_location);
  
  var options = $("#sex");
  for(var sex in counts.sex) {
    $(options).append("<option value=\""+sex+"\">"+sex+ " - "+counts.sex[sex]+"</option>");
  }
  
  var options = $("#status");
  for(var status in counts.relationship_status) {
    $(options).append("<option value=\""+status+"\">"+status+ " - "+counts.relationship_status[status]+"</option>");
  }
  
  /*var options = $("#online option");
  $(options[1]).text($(options[1]).text()+ " - " + counts.online.yes);
  $(options[2]).text($(options[2]).text()+ " - " + counts.online.no);  
  */
  
  if (advanced_mode) {
    console.log("taxonomy", counts);

    var options = $("#taxonomy>ul");
    counts.taxonomy_arrays = {}; //create object to hold the arrays
    for(var t in counts.taxonomy) {
      //duplicating taxonomy objects into an array
      counts.taxonomy_arrays[t] = [];
      for (var i in counts.taxonomy[t]) {
        counts.taxonomy_arrays[t].push({id:i,count:counts.taxonomy[t][i]}); //insert count into array
      }
      //sort the array
      counts.taxonomy_arrays[t].sort(function(a,b) {
        // put the "doesn't say"'s at the top
        if (a.id == "Doesn't say" && b.id != "Doesn't say") return -1; // put this at the top
        if (a.id != "Doesn't say" && b.id == "Doesn't say") return 1; // put this at the top
        if (a.id == "Doesn't say" && b.id == "Doesn't say") return 0; // put this at the top
        // then sort count desc, id asc
        if (a.count != b.count) {
          return b.count - a.count; //descending order
        } else {
          if (a.id < b.id) return -1;
          if (a.id > b.id) return 1;
        }
        return 0;
      });
    $(options).append("<li class=\""+t.replace(/ /g,'_')+"\"><span onclick=\"taxonomy_category_click(this);\" class=\"title\">"+t+ "</span><span class=\"checklist\"><ul></ul></span><ul>");    
      for (var i in counts.taxonomy_arrays[t]) {
        var count = counts.taxonomy_arrays[t][i];
        $(options).find("li."+t.replace(/ /g,'_')+">ul").append("<li><input type=\"checkbox\" onclick=\"taxonomy_checkbox_click(this)\" id=\""+utf8_to_b64(t+"$%$"+count.id)+"\" /><label for=\""+utf8_to_b64(t+"$%$"+count.id)+"\">"+count.id.trim()+ " - "+count.count+"</label></li>"); //note the checkbox value contains the untrimmed string - which seemed easier than trimming all the string seperately.
      }
    }
    $(options).append("</ul></li>");
  }
}

function taxonomy_category_click(ele) {
  $(ele).parent().toggleClass('open');
  //set width of taxonomy filter to keep hidden friends out of the way
  $("#taxonomy_filter").width($("#taxonomy").width()+$("#taxonomy_filter label").width());
}

var taxonomy_values_checked = {}; // this is just a shortcut to save having to loop through hundreds of checkboxes
function taxonomy_checkbox_click(checkbox) {
  var cb_name = $(checkbox).attr("id");
  //var checked = $(checkbox).attr("checked");
  var unescaped_name = b64_to_utf8(cb_name);
  //maintain an index to the checked boxes
  if (taxonomy_values_checked[unescaped_name]) {
    // if the checkbox was already checked, remove it from the list
    delete(taxonomy_values_checked[unescaped_name]);
    $(checkbox).parent().parent().parent().find('.checklist ul .'+cb_name).remove();
  } else {
    // else add it to the index
    taxonomy_values_checked[unescaped_name] = true;
    
    //add this value to the visible list of checked boxes
    $(checkbox).parent().parent().parent().find('.checklist ul').append("<li class=\""+cb_name+"\"><a href=\"#\" onclick=\"taxonomy_checklist_click('"+cb_name+"');\">"+unescaped_name.split('$%$')[1]+"</a></li");
  }
  map_update();
}

function taxonomy_checklist_click(cb_name) {
  var checkbox = document.getElementById(cb_name); //$("#"+cb_name);//jquery doens't like the $%$
  checkbox.checked = false; //uncheck appropriate checkbox
  taxonomy_checkbox_click(checkbox);
  return true; //cancel native click event
}

function map_update() {
  var which_location = $("#which_location").val(), map_flag; //get which location type to show
  counts.hidden_friends = []; // reset the list of hidden friends
  for(var f in data) {
    friend = data[f];
    
    map_flag = map; //default is to add to the map
    
    //filters
    var sex = $('#sex').val();
    if (sex != 'Any') {
      if (friend.sex != sex) {
        map_flag = null;
      }
    }
    
    var relationship_status = $('#status').val();
    if (relationship_status != 'Any') {
      if (friend.relationship_status != relationship_status) {
        map_flag = null;
      }
    }
    
    var flist = $('#list').val();
    if (flist != 'Any') {
      if (!friendsinfriendlists[flist][friend.uid]) {
        map_flag = null; 
      }
    }    
    
    /*var online = $('#online').val();
    if (online != 'Any') {
      if (friend.online_presence != online) {
       map_flag = null; 
      }
    }*/
    
    
    if (advanced_mode) {
      //check to see if any taxonomy values are checked. (easier said than done).
      var taxonomy_has_values = false;
      for(var prop in taxonomy_values_checked) {
        if (taxonomy_values_checked.hasOwnProperty(prop)) {
          taxonomy_has_values = true;
          break;
        }
      }    
      
      if (taxonomy_has_values) {
        // if gets here then at least one value is checked, therefore default is now to hide unselected markers
        //console.log("taxonomy has values checked");
        var taxonomy_match = false;
        for (t in taxonomy_values_checked) {
          //very complicated bit of code, TODO: try to refactor to something simpler :)
          //gets the data using the mapTitletoField index and checks to see if any of this friends values match
          var field = mapTitlesToFields[t.split('$%$')[0].replace(/_/g,' ')];//TODO:a more consistent solution than "randomly" converting _'s to spaces and back again
          var value =  t.split('$%$')[1];
          
          if (field.type == 'string') {
            //awkwardly means an array of strings :/
            if (friend[field.field_name].indexOf(value) > -1) {
              taxonomy_match =true;
              break; //don't need to do more
            } 
          } else {
            //field type == 'array'
            var ary = friend[field.field_name];
            //var ary_field = field[field_name];
            for (var i=0; i < ary.length; i++) {
              if (field.sub_field) {
                var val = getSubField(ary[i], field.sub_field.split('.'));
              } else {
                var val = ary[i];
              }
              if (val == value) {
                taxonomy_match = true;
                break; //don't need to do more
              }
            }
          }
        }
        if (taxonomy_match == false) {
          map_flag = null;
        }
        
      }
    }
        
    switch(which_location) {
      case "current_location":
        if (friend.current_location) {
          friend.current_location.marker.setMap(map_flag);
        } else {
          if (map_flag != null) counts.hidden_friends.push(friend);
        }
        if (friend.current_address) friend.current_address.marker.setMap(null);
        if (friend.hometown_location) friend.hometown_location.marker.setMap(null);
        break;
      case "current_address":
        if (friend.current_location) friend.current_location.marker.setMap(null);
        if (friend.current_address) {
          friend.current_address.marker.setMap(map_flag);
        } else {
          if (map_flag != null) counts.hidden_friends.push(friend);
        }
        if (friend.hometown_location) friend.hometown_location.marker.setMap(null);      
        break;
      case "hometown_location":
        if (friend.current_location) friend.current_location.marker.setMap(null);
        if (friend.current_address) friend.current_address.marker.setMap(null);
        if (friend.hometown_location) {
          friend.hometown_location.marker.setMap(map_flag);      
        } else {
          if (map_flag != null) counts.hidden_friends.push(friend);
        }
        break;
    }
  }
  
  //publish list of hidden friends
  $("#fake_select2 option:first-child").text(counts.hidden_friends.length + " friends not sharing their location on map");
  $("#no_location li").remove();
  for (var i=0; i < counts.hidden_friends.length; i++) {
    $("#no_location ul").append("<li><a href=\""+counts.hidden_friends[i].profile_url+"\" target=\"_blank\">"+counts.hidden_friends[i].name+"</a></li>");
  }
}

var advanced_mode;
function advanced_mode_set(ele, from_ui) {
  if (!window.atob) {
    alert("sorry, your browser is not able to run advanced mode. please upgrade to the latest browser version");
    return;
  }
  
  advanced_mode = ele;
  if (!from_ui) {
    // don't do this if the change has come from the ui otherwise might get into infinite loop
    $('#advmode').prop('checked', ele); 
  } else {
    if (advanced_mode) {
      // permissions upgrade request, so reauthenticate user and fetch new data
      $("#advmode_enabled").show();
      setTimeout(function(){ $("#advmode_enabled").fadeOut();}, 2000); 
      fb_init_get_data();
      map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
    }
  }
  settings.set('advmode',advanced_mode); 
  
  if (advanced_mode) {
    $("#taxonomy_filter").show(); 
    $("BODY").addClass("advanced_mode"); 
  } else {
    $("#taxonomy_filter").hide();
    $("BODY").removeClass("advanced_mode"); 
  }
}

function toggle_taxonomy(){
  if ($('#taxonomy').is(":visible")) {
    $('#taxonomy').hide(); 
    //$('#fake_select').blur();
  } else {
    $('#taxonomy').show(); 
    //$('#fake_select').focus(); 
  }
  $("#taxonomy_filter").width($("#taxonomy").width()+$("#taxonomy_filter label").width());
}

function toggle_controls() {
  if ($('#controls').is(":visible")) {
    $('#controls,#footer').hide(); 
  } else {
    $('#controls,#footer').show();  
  } 
}


if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function (obj, fromIndex) {
    if (fromIndex == null) {
        fromIndex = 0;
    } else if (fromIndex < 0) {
        fromIndex = Math.max(0, this.length + fromIndex);
    }
    for (var i = fromIndex, j = this.length; i < j; i++) {
        if (this[i] === obj)
            return i;
    }
    return -1;
  };
}

settings = {
  // if localStorage available, use that, else use a cookie
  get:function(i, def) {
    if (window.localStorage) {
      if (localStorage.getItem(i)) {
        return localStorage.getItem(i);
      } else {
        if (typeof(def) === 'function') {
          return def();
        } else {
          return def;
        }
      }
    } else {
      if ($.cookie(i)) {
        return $.cookie(i);
      } else {
        if (typeof(def) === 'function') {
          return def();
        } else {
          return def;
        }
      }
    }
  },
  set:function(i, val) {
    if (window.localStorage) {
      localStorage.setItem(i,val);  
    } else {
      $.cookie(i, val, {path:'/'});
    }
  }
}

function utf8_to_b64( str ) {
    var b64=window.btoa(encodeURIComponent( escape( str )))
    return b64.replace(/=/g,'_'); //remove the trailing ='s
}

function b64_to_utf8( str ) {
    return unescape(decodeURIComponent(window.atob( str.replace(/_/g,'=') ))); // put the = back
}
