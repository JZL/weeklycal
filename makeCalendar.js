/*TODO:
  - If endDate is on next day
*/
var CALENDAR_IDS = {
    "jlangli1":   "jlangli1@swarthmore.edu",
    "jonahmail1": "jonahmail1@gmail.com",
    "daysOff":    "fjl75not0nhq75hkhm2phkj67o@group.calendar.google.com",                  //ALl Langlieb Days Off
    "due":        "swarthmore.edu_ji5sie4fh0ddijtuithbqdse28@group.calendar.google.com",   //Due Dates
    "jew":        "en.judaism#holiday@group.v.calendar.google.com",                        //Judaism Cal
    "classes":    "swarthmore.edu_0ha19taudgvpckfmel7okbq6ic@group.calendar.google.com",   //SCCS Class Schedule
    "todo":       "swarthmore.edu_d4fd5qnh3r5a7aqdc2hk9fk5ag@group.calendar.google.com",   //TODO ON
    "unusual":    "swarthmore.edu_dop0bh53409lheq23ell6ignqk@group.calendar.google.com",   //Series of Unusual Events
    //"swarthmore.edu_g7nk3sf5s5ttg27r4cdjgpdtto@group.calendar.google.com", //Class Schedule Pre-SCCS
}

var START_DATE = new Date();
var INDENT_SPACES = "    "


var BOLD_CALS = ["todo", "unusual", "due"]

var MSINDAY = 24*60*60*1000
var newLines = "\n\n\n\n\n\n\n\n\n\n"
var hourTable = [[8,""],[9,""],[10,""],[11,""],[12,""],[1,""],[2,""],[3,""],[4,""],[5,""]]
var longestLength=16

var handleBarsContext = [];
/*[
  [week1 typeof day],
  [week2 typeof day],
  ]
 */

function Event(summary, isBold){
    this.summary = summary;
    this.bold = isBold;

    //TODO escape
    this.toHTMLString = function(){
        if(this.isBold == true){
            return "<b>"+this.summary+"</b>";
        }else{
            return this.summary;
        }
    }
}

function timedEvent(summary, isBold, dates){ //times = [startTime, endTime]
    Event.call(this, summary, isBold);

    this.startHM = setHM(dates[0]); //startHourMin
    this.endHM   = setHM(dates[1]);
    this.len = this.endTime - this.startTime;

    //compose HM from date. Not needed to be global
    function setHM(date){
        return date.getHours()*100+date.getMinutes();  
    }

    //decompose hours, minutes from HM
    function getHM(HM){
        return [Math.floor(HM/100), HM%100] 
    }

    this.getStartHM = function(){
        return getHM(this.startHM)
    }
    this.getEndHM = function(){
        return getHM(this.endHM);
    }

    this.toHTMLString = function(level, startOrEnd){
        var arrow;
        if(startOrEnd == 0){
            arrow = "△" 
        }else if(startOrEnd == 1){
            arrow = "▽"
        }
        var min;
        if(startOrEnd == 0){
            min = this.startHM%100;
        }else if(startOrEnd == 1){
            min = this.endHM%100;
        }else{
            min = ":00" 
        }
        var str = "";
        //If default param (only way =2), then is in due/todo so want full hour
        //and no arrows
        str += ":"+min+INDENT_SPACES.repeat(level)+" "+arrow+this.summary;
        if(this.bold){
            return "<b>"+str+"</b>";
        }else{
            return str;
        }
    }

}

function day(date){
    var days_of_weekArr =  ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"];

    this.date = date;
    this.dow = days_of_weekArr[this.date.getDay()];

    this.todo = [];
    this.due = [];
    this.allDayEvents = []; //normal events
    //this.timedEvents = []; //timedEvents
    this.timedEventTimes = {
        starts: [],
        ends: [],
        firstStart: null, //No negative time so safe
        lastEnd: null     //Time always > 0 so safe
    }

    this.addTODO = function(anEvent){
        this.todo.push(anEvent)
    }
    this.addDue = function(anEvent){
        this.due.push(anEvent);
    }
    this.addAllDayEvent = function(anEvent){
        this.allDayEvents.push(anEvent);
    }
    this.addTimedEvent = function(aTimedEvent){
        this.timedEventTimes.starts.push([aTimedEvent, 0]); //0 = starts
        this.timedEventTimes.ends.push([aTimedEvent, 1]); //1 = ends. Needed to keep track of so know which time to decompose later
        var startEndHours = [aTimedEvent.startHM, aTimedEvent.endHM]
        if(this.timedEventTimes.firstStart == null){
           this.timedEventTimes.firstStart = startEndHours[0]
           this.timedEventTimes.lastEnd = startEndHours[1]
        }

        if(startEndHours[0]< this.timedEventTimes.firstStart){
            this.timedEventTimes.firstStart = startEndHours[0];
        }
        if(startEndHours[1]< this.timedEventTimes.lastEnd){
            this.timedEventTimes.lastEnd = startEndHours[1]
        }
    }
    this.getDateStr = function(){
        console.log(this.date);
        return this.dow+" "+ (this.date.getMonth()+1)+"/"+this.date.getDate();
    }
    this.makeFlat = function(){
        this.flattenTimedEvents();
        this.flatDue            = this.flattenDue();
        this.flatTODO           = this.flattenTODO();
    }
    this.flattenDue = function(){
        return flattenDueOrTODO("Due", this.due)
    }

    this.flattenTODO = function(){
        return flattenDueOrTODO("TODO", this.todo)
    }

    function flattenDueOrTODO(doOrTodoStr, doOrTodo){
        var indent = INDENT_SPACES.repeat(5);
        var str = indent+doOrTodoStr+": ";
        for(var i in  doOrTodo){
            //Overloading should take care if it is an hourly or daily event
            str += indent+INDENT_SPACES+"□ "+
                doOrTodo[i].toHTMLString();
        }
        return str;
    }


    this.flattenTimedEvents = function(){
        this.flatTimeEvents = []; //2D array of [hour, str: description (:MM SUMMARY)]
        //Sort starts and ends by start/endHM and length secondarily. In
        //ends, want longest to bookend (so sort descending and then ascending
        //Need [0] so get timedEvent, not 0/1 for start/end
        this.timedEventTimes.starts.sort(function(x, y){return ((x[0].startHM-y[0].startHM)||(-x[0].len+y[0].len))});
        this.timedEventTimes.ends  .sort(function(x, y){return ((x[0].endHM-  y[0].endHM  )||( x[0].len-y[0].len))});


        //ends first becaus want them to be first in every hour
        var startAndEndTimes = combineStartAndEnd(this.timedEventTimes.ends.concat(this.timedEventTimes.starts),   startAndEndTimes);//Object of objects with outer key = hour, inner key = minutes. When loopings, NEEDS TO GO IN NUMERICAL ORDER

        //Want to be ints so automaticall floors
        var startHour = Math.min(9, Math.floor(this.timedEventTimes.firstStart/100));
        var endHour = Math.max((8+12), Math.floor(this.timedEventTimes.lastEnd/100));

        //Every time enter event++, exit event --. If on hour and >0, then in
        //middle of event so need "|"
        var numEventsDeep = 0; 
        for(var hour = startHour; hour<=endHour; hour++){
            var hourEvents = startAndEndTimes[hour]
                if(!hourEvents){
                    //Should always be positive
                    if(numEventsDeep < 0){
                        throw "That's weird, numEventsDeep shouldn't be negative"
                    }
                    if(numEventsDeep != 0){
                        //Empty hour, needs "|"
                        this.flatTimeEvents.push([hour, INDENT_SPACES.repeat(numEventsDeep)+"|"])
                    }
                }else{
                    var hourEventStr = "";
                    minKeys = Object.keys(hourEvents).sort(function(x, y){
                        if(x == "netEvents" || y == "netEvents"){
                            return -1; //just skip
                        }
                        return (parseInt(x) - parseInt(y))

                    })

                    for(var z = 0; z<minKeys.length;z++){
                        if(minKeys[z] == "netEvents"){
                            continue;
                        }
                        var minEvents = hourEvents[minKeys[z]];
                        for(var i = 0; i<minEvents.length;i++){
                            if(minEvents[i][1] == 0){
                                //start
                                numEventsDeep++
                            }else{
                                numEventsDeep-- 
                            }
                            hourEventStr+=minEvents[i][0].toHTMLString(numEventsDeep, minEvents[i][1])+"\n";
                        }
                        this.flatTimeEvents.push([hour, hourEventStr]);
                    }
                }
        }
    }

    //Combine end 1st then start
    function combineStartAndEnd(startsAndEnds){
        var result = {}
        for(var i = 0; i<startsAndEnds.length;i++){
            var HMs;
            if(startsAndEnds[i][1] == 0){
                //is a start
                HMs = startsAndEnds[i][0].getStartHM(); //hour, min
            }else{
                HMs = startsAndEnds[i][0].getEndHM(); //hour, min
            }
            if( result[HMs[0]]== null){
                result[HMs[0]]= {netEvents: 0}; //netEvents keeps track per hour if there is an ongoing event
            }

            if(startsAndEnds[i][1] == 0){
                result[HMs[0]].netEvents++
            }else{
                result[HMs[0]].netEvents--
            }

            result[HMs[0]][HMs[1]];
            if(result[HMs[0]][HMs[1]]== null){
               result[HMs[0]][HMs[1]] =  [];
            }
            result[HMs[0]][HMs[1]].push(startsAndEnds[i])
        }
        console.log(1);
        return result;
    }
}

function makeWeeklyCalendar(twoWeekEvents, mondays){
    console.log("starting")
        console.log(twoWeekEvents)
    makePaper(twoWeekEvents[0],  mondays[0], false);
    makePaper(twoWeekEvents[1],   mondays[1], true); //for backpage, true = condensed
}

function makePaper(events, startDate, minimizeSize) {
    console.log("make paper")
    var week = [];
    for(var i = 0; i<7; i++){
        week.push(new day(addDaysDate(startDate, i)));
    }
    for(var i in events.timedEvent){
        var gCalEvent = events.timedEvent[i];
        var bold = false;
        if(BOLD_CALS.indexOf(gCalEvent.cal)!=-1||
                gCalEvent.event.summary[0] == "!"){
            bold = true; 
            gCalEvent.event.summary.replace(/^!*/, "");
        }

        var event = new timedEvent(gCalEvent.event.summary, bold, gCalEvent.startEnd);

        week[gCalEvent.dayIndex].addTimedEvent(event);

        //For timedEvents, want to be in todo/due AND hourly breakdown
        switch(gCalEvent.cal){
            case "todo":
                week[gCalEvent.dayIndex].addTODO(event);
                break;
            case "due":
                week[gCalEvent.dayIndex].addDue(event);
                break;
        }
    }
    for(var i in events.allDay){
        var gCalEvent = events.allDay[i];
        var bold = false;
        if(BOLD_CALS.indexOf(gCalEvent.cal)!=-1||gCalEvent.event.summary[0] == "!"){
            bold = true; 
            gCalEvent.event.summary.replace(/^!*/, "");
        }

        var event = new Event(gCalEvent.event.summary, bold)

            //For timedEvents, want to be in todo/due OR daily breakdown
            switch(gCalEvent.cal){
                case "todo":
                    week[gCalEvent.dayIndex].addTODO(event);
                    break;
                case "due":
                    week[gCalEvent.dayIndex].addDue(event);
                    break;
                default:
                    week[gCalEvent.dayIndex].addAllDayEvent(event)

            }
    }
        console.log("flattened: ");
    for(var i = 0; i<7; i++){
        //Takes the array of events -> flattened array of hours
        week[i].makeFlat();
        console.log(week[i])
        w = week
    }
    //handleBarsContext.push(week);
}

//function getMonday(d) {
//  d = new Date(d);
//  var day = d.getDay(),
//      diff = d.getDate() + day + (day == 0 ? -6:1); // adjust when day is sunday
//  return new Date(d.setDate(diff));
//}

function getMonday(d){
    d = new Date(d.setHours(0,0,0,0))
        var day = d.getDay()
        if(day == 0){
            return addDaysDate(d, 1)
        }else if(day == 6){
            return addDaysDate(d, 2)
        }else{
            return addDaysDate(d, (8-day))
        }
}


function armyToNormalTime(hour, padNums){
    if(hour == "allDay"){
        return ""
    }else if(hour == "TODO"){
        return "□ "
    }else if(isNaN(hour) == true){
        return hour+": "
    }
    if(hour == 12){
        return 12
    }else{
        if(padNums){
            return pad(hour%12, 2, " ")
        }else{
            return hour%12
        }
    }
}
//var hourTable = []
//for(var i = 8; i<=12; i++){
//hourTable.push([i, ""])
//}
//for(var i = 1; i<=8; i++){
//hourTable.push([i, ""])
//}
//JSON.stringify(hourTable)

function truncate(str, length){
    //  if(z == 0 && isStart === true){
    //    return bold(str.replace(/^\!/, ""))
    //  }
    if(str.indexOf("!")==0){
        return str.replace(/^\!/, "")
    }
    if(str.length > length){
        return str.substring(0, length-2)+".."
    }else{
        return str
    }
}

function bold(str){
    for(i in boldArr){
        str = str.replace(boldArr[i][0], boldArr[i][1])
    }
    return str
}

function test(){
    allCals = CalendarApp.getCalendarById("fjl75not0nhq75hkhm2phkj67o@group.calendar.google.com")
        //    var allDays = CalendarApp.getCalendarById("jlangli1@swarthmore.edu").getEvents(startDate, new Date(startDateTime+13*msInDay))
        var allDays = allCals.getEvents(new Date("11/28/2016"), new Date("11/29/2016"))
        for(var event in allDays){
            Logger.log(allDays[event].getTitle())
        }
}

function addSpaces(startTime, endTime, write){


    //if false, is end and then want to change usedTimes arr, else, don't change usedtimes
    //    [[start, end], "spaces"]
    //    var usedTimes = []

    for(var p in usedTimes){
        //    if()
    }
}

function compareToSpace(a,b){
    return (a.substring(0, a.indexOf(" "))).localeCompare(b.substring(0, b.indexOf(" ")));
}

function compareSecondElem(a, b){
    return (a[1]).localeCompare(b[1]);
}
function testt(){
    Logger.log(getRandomFont())
}
function getRandomFonts(numFonts){
    var resp = UrlFetchApp.fetch("https://www.googleapis.com/webfonts/v1/webfonts?key=AIzaSyCU6bm3mMmZQCn-cbuHa1wzZAu7oh7OlT0").getContentText()
        var allFonts = JSON.parse(resp).items
        var retFonts = []
        for(var i = 0; i<=numFonts;i++){
            retFonts.push(allFonts[Math.floor(Math.random()*allFonts.length)].family)
        }
    return retFonts

}

function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function convertDateToUTC(date) { 
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()); 
}

function normalizeDate(d){
    return new Date(new Date(d).setHours(0,0,0,0))
}

//Always do day addition with this because of DST
function addDaysTime(date, days){
    return addDaysDate(date, days).getTime()
}

function addDaysDate(date, days){
    var dat = new Date(date.getTime());
    dat.setDate(dat.getDate() + days);
    return dat
}

function treatAsUTC(date) {
    var result = new Date(date);
    result.setMinutes(result.getMinutes() - result.getTimezoneOffset());
    return result;
}

function daysBetween(startDate, endDate) {
    var millisecondsPerDay = 24 * 60 * 60 * 1000;
    return (treatAsUTC(endDate) - treatAsUTC(startDate)) / millisecondsPerDay;
}

function listTaskLists() {
    var taskLists = Tasks.Tasklists.list();
    if (taskLists.items) {
        for (var i = 0; i < taskLists.items.length; i++) {
            var taskList = taskLists.items[i];
            Logger.log('Task list with title "%s" and ID "%s" was found.',
                    taskList.title, taskList.id);
        }
    } else {
        Logger.log('No task lists found.');
    }
}

function getTasks(){
    var returnString = []
        var out = []
        var taskListId  = "MTA1MDI2ODExMTUyMjg4MzgzMzk6MDow"
        var tasks = Tasks.Tasks.list(taskListId, {
            showCompleted: false 
        });
    if (tasks.items) {
        for (var i = 0; i < tasks.items.length; i++) {
            var task = tasks.items[i];
            Logger.log('task: %s, %s, %s, %s, %s',
                    task.title, task.position, task.notes, task.status, new Date(task.due));
            if(task.title==""){
                continue
            }
            returnString.push((task.due ? Utilities.formatDate(new Date(task.due), "EST", "MM/dd E")+" " : '          ')+"☐ "+task.title.replace(/^\s*/g,"")+(task.notes ? ': '+task.notes.replace(/\n/g, "") : ''))
        }
    } else {
        Logger.log('No tasks found.');
        returnString = "No Tasks!"
    }
    Logger.log("------------")
        Logger.log("\n"+returnString)
        var numIt = 0
        for(var i = 0; i<returnString.length;i+=7){
            if(out[i] == ""){
                out[i]=returnString[numIt*7+i]
            }else{
                //pad
                out[i]+=""+returnString[numIt*7+i]
            }
            numIt++
        }
    return returnString
}


function starredToTask(){
    var allTodo = GmailApp.search("in:inbox is:starred label:todo");
    var allSubj = []
        for(var i in allTodo){
            allSubj.push("          ☐ "+allTodo[i].getFirstMessageSubject().replace(/\[.*\]\s*/, ""))
        }
    return allSubj

}

function todoCal(){
    var now = START_DATE;
    var allTitle = [];
    //100 days, see if too slow
    var allEvents = CalendarApp.getCalendarsByName("TODO ON")[0].getEvents(now, new Date(now.getTime()+(100*24*60*60*1000)), {
        search: '"TODO"'
    })
    for(var i in allEvents){
        allTitle.push(Utilities.formatDate(new Date(allEvents[i].getEndTime()), "EST", "MM/dd E")+" ☐ "+allEvents[i].getTitle().replace("TODO ", ""))
    }
    return allTitle
}
function doTe(){
    var document = DocumentApp.openById("1t5SK5nrz4DrpN0Ryjv3fpzLwjgUL62jExbV3RUM6acU")
        var body = document.getBody().clear()
        body.appendTable([[getTasks().concat(starredToTask(), todoCal()).sort().join("\n"), DocumentApp.openById("1BK_iIyOSTEZ9RG97kbrhEVipBp6tWOagHFJBOKMsqzA").getBody().getText()]]).setBorderColor("#FFFFFF").setFontFamily("Droid Sans Mono").setFontSize(8)
}
