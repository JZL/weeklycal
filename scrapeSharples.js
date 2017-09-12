function httpGetAsync(theUrl, callback){
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
    xmlHttp.send(null);
}

function getSharplesFood(callback){
    httpGetAsync("https://cors-anywhere.herokuapp.com/https://dash.swarthmore.edu/weekly-menu", function(txt){
        var retFoodWeek = []
            var parser=new DOMParser();
        var htmlDoc=parser.parseFromString(txt, "text/html");
        var weeks = htmlDoc.querySelectorAll(".weekday");
        for(var i = 0; i<weeks.length;i++){
            var dayHead = weeks[i].children[0].children[0].children[0].children[0].firstChild.textContent
            var dayMealArr = weeks[i].children[0].children[1].querySelectorAll(".event-body");
            var dayMealStr = ""
                for(var j = 0; j<dayMealArr.length;j++){
                    var dayStrTmp = replaceUneededSharples(dayMealArr[j].innerText)
                    if(dayStrTmp!=""){
                        dayMealStr += dayStrTmp.replace(/\n/g, "<br>-&nbsp;")+"<hr>\n";
                    }
                }

            console.log(typeof dayHead);
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
