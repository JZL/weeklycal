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
var INDENT_SPACES = "&nbsp;".repeat(3);


var BOLD_CALS = ["todo", "unusual", "due"]

var newLines = "\n\n\n\n\n\n\n\n\n\n"
var hourTable = [[8,""],[9,""],[10,""],[11,""],[12,""],[1,""],[2,""],[3,""],[4,""],[5,""]]
var longestLength=16

function Handlebars_compileFromID(id){
    return Handlebars.compile(document.getElementById(id).innerHTML);
}

function Handlebars_registerPartialFromID(name, id){
    var template = Handlebars_compileFromID(id);
    Handlebars.registerPartial(name, template);
}

//https://stackoverflow.com/a/11252167/999983 but rounded
function treatAsUTC(date) {
    var result = new Date(date);
    result.setMinutes(result.getMinutes() - result.getTimezoneOffset());
    return result.getTime();
}

function daysBetween(startDate, endDate) {
    //Need to copy date so don't inadvertandly change
    var roundStart = new Date(startDate.getTime())
    var roundEnd =   new Date(endDate  .getTime())
    roundStart.setHours(0,0,0,0)
    roundEnd.setHours(0,0,0,0)
    var millisecondsPerDay = 24 * 60 * 60 * 1000;
    return Math.round((roundEnd.getTime() - roundStart.getTime())/millisecondsPerDay)
    /*
    return ((treatAsUTC(roundEnd) - treatAsUTC(roundStart)) / millisecondsPerDay);
    */
}

function makeWeeklyCalendar(twoWeekEvents, mondays){
    Handlebars_registerPartialFromID("dayCell", "dayCell_partial");
    Handlebars_registerPartialFromID("hourRow", "hourRow_partial");

    var mainTable_template = Handlebars_compileFromID("maintable_template")


    console.log("starting")
    console.log(twoWeekEvents);
    //TODO make var week1
    getSharplesFood(function(sharplesWeek){
        week1 = makePaper(twoWeekEvents[0],  mondays[0], false, sharplesWeek);
        week2 = makePaper(twoWeekEvents[1],  mondays[1], true);

        var week1HTML = mainTable_template(week1);
        var week2HTML = mainTable_template(week2);
        document.getElementById("week1").innerHTML = week1HTML+"<div class='page-break'></div>"+week2HTML;
    })
    //var week2 = makePaper(twoWeekEvents[1],   mondays[1], true); //for backpage, true = condensed
}
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

    this.setIndentLevel = function(level){
        this.indentLevel = level;
    }

    this.toHTMLString = function(startOrEnd){
        var arrow;
        if(startOrEnd == 0){
            arrow = "\u25BD"  //upwards arrow https://www.compart.com/en/unicode/U+25BD
        }else if(startOrEnd == 1){
            arrow = "\u25b3" //downward arrow https://www.compart.com/en/unicode/U+25B3
        }
        var min;
        if(startOrEnd == 0){
            min = this.startHM%100;
        }else if(startOrEnd == 1){
            min = this.endHM%100;
        }else{
            //If printing a timed event in due/todo
           return Math.floor(this.startHM/100)+":"+toPaddedStr(this.startHM%100)+"-"+
               Math.floor(this.endHM/100)+":"+toPaddedStr(this.endHM%100)+" "+
               this.summary;
        }
        var str = "";
        //If default param (only way =2), then is in due/todo so want full hour
        //and no arrows
        str += ":"+toPaddedStr(min)+INDENT_SPACES.repeat(this.indentLevel)+" "+arrow+this.summary;
        if(this.bold){
            return "<b>"+str+"</b>";
        }else{
            return str;
        }
    }


}

function day(date){
    this.flat = {}; //store all the flattened (final) objecta
    var days_of_weekArr =  ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"];

    this.date = date;
    this.dow = days_of_weekArr[this.date.getDay()];
    this.getDateStr = function(){
        return this.dow+" "+ (this.date.getMonth()+1)+"/"+this.date.getDate();
    }
    this.flat.dateString = this.getDateStr();

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

    this.sharplesWeek;

    this.addSharples = function(sharplesText){
        this.sharplesWeek = sharplesText;
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
        if(startEndHours[1]> this.timedEventTimes.lastEnd){
            this.timedEventTimes.lastEnd = startEndHours[1]
        }
    }
    this.makeFlat = function(minimizeSize){
        this.flattenTimedEvents(minimizeSize);
        this.flat.due            = this.flattenDue();
        this.flat.TODO           = this.flattenTODO();
        this.flat.sharples       = this.sharplesWeek;
    }
    this.flattenDue = function(){
        return flattenDueOrTODO("Due", this.due)
    }

    this.flattenTODO = function(){
        return flattenDueOrTODO("TODO", this.todo)
    }

    function flattenDueOrTODO(doOrTodoStr, doOrTodo){
        var indent = INDENT_SPACES.repeat(5);
        var str = ""
        for(var i in  doOrTodo){
            //Overloading should take care if it is an hourly or daily event
            //square box  https://www.compart.com/en/unicode/U+25A1
            str += (str == "" ? "" :INDENT_SPACES+indent)+"\u25A1 "+
                doOrTodo[i].toHTMLString()+"<br>";
        }
        if(str!=""){
            str = indent+doOrTodoStr+": "+str;
        }
        return str;
    }



    this.flattenAllDay = function(){
        var allDayStr = "";
        for(var i in this.allDayEvents){
            allDayStr+="&nbsp".repeat(2)+"-&nbsp;"+this.allDayEvents[i].toHTMLString()+"<br>";
        }
        if(allDayStr!=""){
            allDayStr+="&nbsp;"; //add space so have empty line
        }
        //allDayStr = allDayStr.replace(/\<br\>$/, "");
        return allDayStr;
    }

    this.flattenTimedEvents = function(minimizeSize){
        this.flat.timedEvent = []; //2D array of [hour, str: description (:MM SUMMARY)]

        //infinity (incomplete: https://www.compart.com/en/unicode/U+29DC)
        //normal: 
        var flatAllDay = this.flattenAllDay();
        if(flatAllDay!=""){
            this.flat.timedEvent.push(["\u29DC", this.flattenAllDay()]);
        }

        //Sort starts and ends by start/endHM and length secondarily. In
        //ends, want longest to bookend (so sort descending and then ascending
        //Need [0] so get timedEvent, not 0/1 for start/end
        
        //Sort by start/endTime, if equal, sort by how long the event is. Want
        //the short events at the bottom of the startTimes and the top of the
        //endTimes. If both equal, just want to be opposite
        this.timedEventTimes.starts.sort(function(x, y){return ((x[0].startHM-y[0].startHM)||(-x[0].len+y[0].len))|| 1});
        this.timedEventTimes.ends  .sort(function(x, y){return ((x[0].endHM  -y[0].endHM  )||( x[0].len-y[0].len))||-1});


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
                //No event for this hour
                if(!hourEvents){
                    //Should always be positive
                    if(numEventsDeep < 0){
                        throw "That's weird, numEventsDeep shouldn't be negative"
                    }
                    var summaryStr = "";
                    if(minimizeSize == false){
                        if(numEventsDeep != 0){
                            //Empty hour, needs "|"
                            //3 from ":XX "
                            summaryStr+="&nbsp".repeat(4)+INDENT_SPACES.repeat(numEventsDeep-1)+"|";
                        }
                        this.flat.timedEvent.push([armyToRegular(hour), summaryStr])
                    }
                }else{
                    var hourEventStr = "";
                    minKeys = Object.keys(hourEvents).sort(function(x, y){
                        return (parseInt(x) - parseInt(y))
                    })

                    for(var z = 0; z<minKeys.length;z++){
                        var minEvents = hourEvents[minKeys[z]];
                        for(var i = 0; i<minEvents.length;i++){
                            if(minEvents[i][1] == 0){
                                //start
                                //Want to go before ++ because, for instance,
                                //the first event should be at 0, not 1
                                minEvents[i][0].setIndentLevel(numEventsDeep);
                                numEventsDeep++
                            }else{
                                numEventsDeep-- 
                            }
                            hourEventStr+=minEvents[i][0].toHTMLString(minEvents[i][1])+"<br>";
                        }
                    }
                    this.flat.timedEvent.push([armyToRegular(hour), hourEventStr]);
                }
        }
    }

    function armyToRegular(hour){
        if(hour == 12){
            return "12";
        }else{
            var normalHour = hour%12;
            if(normalHour<10){
                return "&nbsp;"+normalHour;
            }else{
                return normalHour.toString();
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
                result[HMs[0]]= {}; 
            }

            if(result[HMs[0]][HMs[1]]== null){
               result[HMs[0]][HMs[1]] =  [];
            }
            result[HMs[0]][HMs[1]].push(startsAndEnds[i])
        }
        return result;
    }
}


function makePaper(events, startDate, minimizeSize, sharplesWeek) {
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
            gCalEvent.event.summary = gCalEvent.event.summary.replace(/^!*/, "");
        }
        if(gCalEvent.event.location){
            if(gCalEvent.event.location.indexOf("*Swarthmore College - ")== 0 ){
                //Copied from swarthmore calendar, make a lot shorter
                //+2 for "- " space
                gCalEvent.event.location = gCalEvent.event.location.substring(gCalEvent.event.location.lastIndexOf("-")+2)
            }
            gCalEvent.event.summary+="@"+gCalEvent.event.location
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
            gCalEvent.event.summary = gCalEvent.event.summary.replace(/^!*/, "");
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
    var Week2D= [
    [],
    [],
    []
    ];
    w = week
    //Only want normal (weekdays)
    for(var i = 0; i<7; i++){
        //Takes the array of events -> flattened array of hours
        if(sharplesWeek){
            //Sharples goes Sun->Sat, myWeek goes Mon->Sun so +1 and rollover
            //Sharples week is [sharples DOW text, sharples meal text]
            //TODO technically, the sunday will be for the week past
            week[i].addSharples(sharplesWeek[(i+1)%7][1])
        }

        if(i == 5||i==6){
            //is sat, need to add sunday
            week[i].makeFlat(true);
            if(i == 6){
                week[5].flat.sun = week[6].flat
            }
        }else{
            week[i].makeFlat(minimizeSize);
        }
        if(i<6){
            Week2D[Math.floor(i/2)][i%2] = week[i].flat;
        }
    }

    console.log("2D week:");
    console.log(Week2D);
    return Week2D
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
            return pad(hour%12, 2, "&nbsp;")
        }else{
            return hour%12
        }
    }
}
function toPaddedStr(int){
    var str = int.toString();
    if(int < 10){
        str = "0"+str;
    }
    return str;
}
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

function back1Week(){
    START_DATE = new Date(new Date().getTime() - 4*24*60*60*1000);
    //Redo all
    listThisWeekEvents();
}
