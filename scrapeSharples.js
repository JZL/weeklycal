function httpGetAsync(theUrl, callback){
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200){
            callback(xmlHttp.responseText);
        }else{
           callback(null); 
        }
    }
    xmlHttp.onerror = function(){
        callback(null);
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
    xmlHttp.send(null);
}

function getSharplesFood(callback){
    /*
     *If want to be faster:

      callback(null)
      return
     */
    httpGetAsync("https://cors-anywhere.herokuapp.com/https://dash.swarthmore.edu/weekly-menu", function(txt){
        if(txt == null){
            //Error
            console.log("Couldn't get response, sending null for sharples")
            callback(null)
            return;
        }
        var retFoodWeek = []
            var parser=new DOMParser();
        var htmlDoc=parser.parseFromString(txt, "text/html");
        var weeks = htmlDoc.querySelectorAll(".weekday");
        //1 bc sunday is for prev week (and is always pasta bar)
        //Push 1 blank for sunday
        retFoodWeek.push(["", ""]);
        for(var i = 1; i<weeks.length;i++){
            var dayHead = weeks[i].children[0].children[0].children[0].children[0].firstChild.textContent
            var dayMealArr = weeks[i].children[0].children[1].querySelectorAll(".event-body");
            var dayMealStr = ""
            //For all break, lunch, dinner:
            //for(var j = 0; j<dayMealArr.length;j++){
            //For just dinner:
            j = dayMealArr.length-1;
                    var dayStrTmp = replaceUneededSharples(dayMealArr[j].innerText)
                    if(dayStrTmp!=""){
                        dayMealStr += dayStrTmp.replace(/\n/g, " -&nbsp;")+"<hr>\n";
                    }
            dayMealStr = "-&nbsp;"+dayMealStr;
            dayHead = replaceUneededSharples(dayHead);
            dayMealStr = replaceUneededSharples(dayMealStr);
            console.log(dayHead)
                console.log(dayMealStr)
                //TODO just going to do current week, if going backward, could/will be
                //wrong
                retFoodWeek.push([dayHead, dayMealStr])
        }
        callback(retFoodWeek);
    })
}

function replaceUneededSharples(str){
    var toDelete = [/^\s*\(v\).*/gm, /^\s*/gm, /\s^$/gm];

    for(var i in toDelete){
        str = str.replace(toDelete[i], "");
    }
    return str;
}
