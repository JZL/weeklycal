
var fromCache = false;
var CLIENT_ID = '547289869760-iegi9mv7q2v5da611gj1uej5daa0jnsv.apps.googleusercontent.com'

// Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
var SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

var authorizeButton = document.getElementById('authorize-button');
var signoutButton = document.getElementById('signout-button');

/**
 *  On load, called to load the auth2 library and API client library.
 */
function handleClientLoad() {
	if(!fromCache){
	gapi.load('client:auth2', initClient);
}
}

/**
 *  Initializes the API client library and sets up sign-in state
 *  listeners.
 */
function initClient() {
	gapi.client.init({
		discoveryDocs: DISCOVERY_DOCS,
		clientId: CLIENT_ID,
		scope: SCOPES,
        fetch_basic_profile: true
	}).then(function() {
		// Listen for sign-in state changes.
		gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

		// Handle the initial sign-in state.
		updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
		authorizeButton.onclick = handleAuthClick;
		signoutButton.onclick = handleSignoutClick;
	});
}

/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 */
function updateSigninStatus(isSignedIn) {
	if (isSignedIn) {
		console.log("Is signed in")
		authorizeButton.style.display = 'none';
        var signedInDiv = document.getElementById("signedIn");
        signedInDiv.style.display = "block";
        document.getElementById("userEmail").innerText = "Hi, "+
                gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile().getEmail()

		if(!fromCache){
			listThisWeekEvents();
		}
	} else {
		console.log("Is not signed in")
		authorizeButton.style.display = 'block';
		signoutButton.style.display = 'none';
	}
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick(event) {
	gapi.auth2.getAuthInstance().signIn();
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick(event) {    
	gapi.auth2.getAuthInstance().signOut();
    document.getElementById("userEmail").innerText = ""
}

function listThisWeekEvents() {
	var twoWeekEvents = [
		//In array has {event, bold: T/F}
		{allDay: [], timedEvent: []}, //week1
		{allDay: [], timedEvent: []}, //week2
	];
	var monday = getMonday(START_DATE);
	var startWeek2= addDaysDate(monday, 7); //Exclusive
    //1 minute off end so exclusive works. TODO might not work for rollover days
	var endWeek2Date = new Date(addDaysDate(getMonday(START_DATE), 14).getTime() - 60*1000); //Exclusive so want at end/start of next day

	var gapiCalendarSearch = function(ID){
		return  gapi.client.request({
			path: 'https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(ID)+'/events',
			params: {
				'timeMin': monday.toISOString(),
				'timeMax': endWeek2Date.toISOString(), //Exclusive time but ONLY for start
				'showDeleted': false,
				'singleEvents': true,
				'orderBy': 'startTime'
			}
		})
	}

	var batch = gapi.client.newBatch();
	for(var nickname in CALENDAR_IDS){

		//2nd param adds the calendar ID as the batch ID so know if bold/etc
		batch.add(gapiCalendarSearch(CALENDAR_IDS[nickname]), 
			{id: nickname}
		)

		/*
		//If want single response promises
			req.then(function(response){
			console.log("single resp response: ")
			console.log(responsest)
			}, function(reason){
			console.log("single resp error: ")
			console.log(reason)
			})
		 */
	}

	batch.then(function(response){
        r = response;
		console.log("whole response: ");
		console.log(response);
		for(var calRespi in response.result){
			var calResp = response.result[calRespi];
			if(calResp.status!=200){
				throw "Error in calResponse: "+calRespi;
			}
			var events = calResp.result.items
			if (events && events.length > 0) {
				for (var i = 0; i < events.length; i++) {
					var event = events[i];
					var date;
					var allDayOrTimed;
					var dayIndex; 
					var startEnd = []
		//Need to collapse date or datetime to one variable to split into weeks
					if (event.start.date) {
		//Is all-day
						startEnd[0] = dateFromAllDayStr(event.start.date); //when browsers (chrome) interpret the date string, they are 1 day behind
						startEnd[1] = dateFromAllDayStr(event.end.  date); //when browsers (chrome) interpret the date string, they are 1 day behind
						allDayOrTimed = "allDay"
					}else{
						startEnd[0] = new Date(event.start.dateTime);
						startEnd[1] = new Date(event.end.  dateTime);
						allDayOrTimed = "timedEvent";
					}
                    var numDaysSpan = daysBetween(startEnd[0], startEnd[1]);
                    //console.log("numDaysSpan: "+numDaysSpan);
                    //Added in case of multi day events
                    //Needs to be <= because, for instance, when on same day, will be = 0 and want to run once
                    for(var day = 0; day<=numDaysSpan; day++){
                        var specificStartDate = addDaysDate(startEnd[0], day);

                        var specificStartTime = specificStartDate.getTime();
                        var specificEndDate = new Date(specificStartTime);
                        specificEndDate.setHours(startEnd[1].getHours(), startEnd[1].getMinutes())
                        var specificEndTime = specificEndDate.getTime();
                        if(specificStartTime <= monday.getTime() || specificEndTime >= endWeek2Date.getTime()){
                            continue; //Stop there
                        }
                        if(specificStartTime>=monday.getTime() && specificEndTime <startWeek2.getTime()){
                            //In 1st week
                                dayIndex = daysBetween(monday, specificStartDate);
                                weekEventIndex = 0
                        }else if(specificStartTime>=startWeek2.getTime()&& specificEndTime <endWeek2Date.getTime()){
                            //In 2nd Week
                            dayIndex = daysBetween(startWeek2, specificStartDate);
                            weekEventIndex = 1
                        }else{
                                console.log("specificStartTime: ");
                                console.log(specificStartTime);
                            throw "Event: "+event.summary+"'s date: "+event.start.date+" is not in either 2 weeks"
                        }
                        //Need to copy startEnd by value
                        twoWeekEvents[weekEventIndex][allDayOrTimed].push({event: event, startEnd: [specificStartDate, specificEndDate], dayIndex: dayIndex, cal: calRespi})
                    }
                }
			} else {
				console.log("No events for calendar: "+calRespi);
			}
		}
		console.log("two Week events:");
		t = twoWeekEvents;
		console.log(twoWeekEvents);
		makeWeeklyCalendar(twoWeekEvents, [monday, startWeek2])
	}, function(reason){
		console.log("whole error: ")
		console.log(reason)
	})
}

function dateFromAllDayStr(dateStr){
    return new Date(dateStr.substring(0,4), //2017
                    parseInt(dateStr.substring(5,7))-1, //09, needs to be 0 indexed
                    dateStr.substring(8, 10)) //02
}
