//Contains general purpose calculations- not necessarily exclusive to this application
var EARTHRAD = 6378.137; //  Earth radius major axis km
var MINRAD = 6356.752; //earth radius minor axis
var semaphore;
var startElevation;
	var keys = require('./apikeys');

function timezoneDefault(zone) {
    zone.zoneAbbr = 'UTC';
    zone.offset = 0;
    zone.zoneName = 'UTC';
}

function gettimezone(start, coords, zone, recall) {
				
     $.ajax({
            url: "/gettimezone.php",
            data: {
                lat: coords.lat,
                lng: coords.lng
            },
            timeout: 5000,
            method: "GET",
            datatype: "json",
	
        })
        .done(function(result) {
			try {
				data=JSON.parse(result);
				if (typeof(data.countryCode) !== 'undefined' )  {			// from geonames, status field only appears if there's an error
					zone.zoneAbbr = data.countryCode;
					zone.offset = data.rawOffset * 3600;	// response in hours, we want seconds
					zone.zoneName = data.timezoneId;
				}
				else {
					timezoneDefault(zone);
				}
			}
			catch (err)
			{ 
				console.log('gettimezone: ' + err.message);
				timezoneDefault(zone);
			}
			
        })
        .fail(function() {
            timezoneDefault(zone);
        })
        .always(function() {
            semaphore--;
            if (semaphore === 0) {
                recall(startElevation);
            }
         });
}

function getBaseElevation(coords, recall) {
    $.ajax({
            url: "/getelevation.php",
            data: {
                lat: coords.lat,
                lng: coords.lng
            },
            timeout: 5000,
            method: "GET",
            dataType: "json"
        })
        .done(function(result) {
			try {
				data = (typeof(result)==='object') ? result: JSON.parse(result);
				if (typeof(data.astergdem) !== 'undefined') {
					startElevation = data.astergdem;
				}
				else {
					startElevation = null;
				}
			}
			catch(err) {
				console.log('getBaseElevation: ' + err.message);
				startElevation = null;
			}
        })
        .fail(function() {
            startElevation = null;
        })
        .always(function() {
            semaphore--;
            if (semaphore === 0) {
                recall(startElevation);
            }
        });
}


module.exports = {

    pad: function(n) {
        return (n < 10) ? ("0" + n.toString()) : n.toString();
    },

    showFormat: function(coords) {
        var latdegrees = Math.abs(coords.lat);
        var latdegreepart = Math.floor(latdegrees);
        var latminutepart = 60 * (latdegrees - latdegreepart);
        var latdir = (coords.lat > 0) ? "N" : "S";
        var lngdegrees = Math.abs(coords.lng);
        var lngdegreepart = Math.floor(lngdegrees);
        var lngminutepart = 60 * (lngdegrees - lngdegreepart);
        var lngdir = (coords.lng > 0) ? "E" : "W";
        return latdegreepart.toString() + "&deg;" + latminutepart.toFixed(3) + "&prime;" + latdir + " " + lngdegreepart.toString() + "&deg;" + lngminutepart.toFixed(3) + "&prime;" + lngdir;
    },

    showDate: function(timestamp) {
        var daynames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        var monthnames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        var localdate = new Date(1000 * timestamp);
        return daynames[localdate.getUTCDay()] + " " + localdate.getUTCDate() + " " + monthnames[localdate.getUTCMonth()] + " " + localdate.getUTCFullYear();
    },


    getAirspace: function(bounds, margin) {
        return $.ajax({
            url: "getairspace.php",
            data: {
                bounds: JSON.stringify(bounds),
                margin: margin
            },
            timeout: 3000,
            method: "POST",
            dataType: "json"
        });
    },

    getUnixTime: function(hhmmss) { //Once the date is displayed we are just tracking offset from midnight
        var utime = 3600 * parseInt(hhmmss.substr(0, 2)) + 60 * parseInt(hhmmss.substr(2, 2)) + parseInt(hhmmss.substr(4, 2));
        return utime;
    },

    parseLatLong: function(latLongString) {
        var latitude = parseFloat(latLongString.substring(0, 2)) +
            parseFloat(latLongString.substring(2, 7)) / 60000.0;
        if (latLongString.charAt(7) === 'S') {
            latitude = -latitude;
        }
        var longitude = parseFloat(latLongString.substring(8, 11)) +
            parseFloat(latLongString.substring(11, 16)) / 60000.0;
        if (latLongString.charAt(16) === 'W') {
            longitude = -longitude;
        }

        return {
            lat: latitude,
            lng: longitude
        };
    },

    getUnixDate: function(ddmmyy) {
        var day = parseInt(ddmmyy.substr(0, 2), 10);
        var month = parseInt(ddmmyy.substr(2, 2), 10) - 1;
        // The IGC specification has a built-in Millennium Bug (2-digit year).
        // I will arbitrarily assume that any year before "80" is in the 21st century.
        var year = parseInt(ddmmyy.substr(4, 2), 10);
        if (year < 80) {
            year += 2000;
        }
        else {
            year += 1900;
        }
        var jsdate = new Date(Date.UTC(year, month, day)); //This is the only time we use the Date object- easiest way to get day of the week.
        return jsdate.getTime() / 1000;
    },

    unixToString: function(timestamp) {
        return this.pad(Math.floor(timestamp / 3600)) + ":" + this.pad(Math.floor((timestamp / 60) % 60)) + ":" + this.pad(timestamp % 60);
    },

    unixToPaddedString: function(seconds) {
        if (seconds < 3600) {
            return Math.floor(seconds / 60) + "mins " + this.pad(seconds % 60) + "secs";
        }
        else {
            return Math.floor(seconds / 3600) + "hrs " + this.pad(Math.floor((seconds / 60) % 60)) + "mins " + this.pad(seconds % 60) + "secs";
        }
    },

    getTrackData: function(start, end) { //Vincenty method: maximum accuracy
        var lat1 = start.lat * Math.PI / 180;
        var lat2 = end.lat * Math.PI / 180;
        var deltaLon = (end.lng - start.lng) * Math.PI / 180;
        var flattening = (EARTHRAD - MINRAD) / EARTHRAD;
        var tanU1 = (1 - flattening) * Math.tan(lat1); //U is reduced latitude
        var cosU1 = 1 / Math.sqrt(1 + tanU1 * tanU1);
        var sinU1 = tanU1 * cosU1;
        var tanU2 = (1 - flattening) * Math.tan(lat2); //U is reduced latitude
        var cosU2 = 1 / Math.sqrt(1 + tanU2 * tanU2);
        var sinU2 = tanU2 * cosU2;
        var lambda1 = deltaLon;
        var lambda2;
        var iteration = 0;
        var sinLambda;
        var cosLambda;
        var sinsq;
        var cossq;
        var sigma;
        var sinSigma;
        var cosSigma;
        var sinAlpha;
        var cos2M;
        var C;
        var g11;

        do {
            sinLambda = Math.sin(lambda1);
            cosLambda = Math.cos(lambda1);
            sinsq = (cosU2 * sinLambda) * (cosU2 * sinLambda) + (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) * (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda);
            sinSigma = Math.sqrt(sinsq);
            if (sinSigma === 0) {
                return 0; // co-incident points
            }
            cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
            sigma = Math.atan2(sinSigma, cosSigma);
            sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma;
            cossq = 1 - sinAlpha * sinAlpha;
            cos2M = cosSigma - 2 * sinU1 * sinU2 / cossq;
            if (isNaN(cos2M)) {
                cos2M = 0;
            }
            C = flattening / 16 * cossq * (4 + flattening * (4 - 3 * cossq));
            lambda2 = lambda1;
            lambda1 = deltaLon + (1 - C) * flattening * sinAlpha * (sigma + C * sinAlpha * (cos2M + C * cosSigma * (-1 + 2 * cos2M * cos2M)));
            iteration++;
        }
        while ((Math.abs(lambda2 - lambda1) > 1e-12) && (iteration < 100));
        if (iteration > 99) {
            alert("Distance out of range: check coordinates");
        }
        var uSq = cossq * (EARTHRAD * EARTHRAD - MINRAD * MINRAD) / (MINRAD * MINRAD);
        var A = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
        var B = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
        var deltaSigma = B * sinSigma * (cos2M + B / 4 * (cosSigma * (-1 + 2 * cos2M * cos2M) - B / 6 * cos2M * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2M * cos2M)));

        var d = MINRAD * A * (sigma - deltaSigma);
        var fwdAz = Math.atan2(cosU2 * sinLambda, cosU1 * sinU2 - sinU1 * cosU2 * cosLambda); //initial bearing
        var brng = Math.round((360 + fwdAz * 180 / Math.PI) % 360);
        //var revAz = Math.atan2(cosU1*sinLambda, -sinU1*cosU2+cosU1*sinU2*cosλ); //final bearing
        return {
            distance: d,
            bearing: brng
        };
    },

    toPoint: function(start, end) { //fast version- used where speed critical
        var lat1 = start.lat * Math.PI / 180;
        var lat2 = end.lat * Math.PI / 180;
        var lon1 = start.lng * Math.PI / 180;
        var lon2 = end.lng * Math.PI / 180;
        var deltaLat = lat2 - lat1;
        var deltaLon = lon2 - lon1;
        var a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = EARTHRAD * c;
        var y = Math.sin(lon2 - lon1) * Math.cos(lat2);
        var x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
        var brng = (360 + Math.atan2(y, x) * 180 / Math.PI) % 360;
        return {
            distance: d,
            bearing: brng
        };
    },

    targetPoint: function(start, distance, bearing) {
        var lat1 = start.lat * Math.PI / 180;
        var lng1 = start.lng * Math.PI / 180;
        var radbrng = bearing * Math.PI / 180;
        var lat2 = Math.asin(Math.sin(lat1) * Math.cos(distance / EARTHRAD) + Math.cos(lat1) * Math.sin(distance / EARTHRAD) * Math.cos(radbrng));
        var lng2 = lng1 + Math.atan2(Math.sin(radbrng) * Math.sin(distance / EARTHRAD) * Math.cos(lat1), Math.cos(distance / EARTHRAD) - Math.sin(lat1) * Math.sin(lat2));
        var retlat = lat2 * 180 / Math.PI;
        var retlng = lng2 * 180 / Math.PI;
        retlng = (retlng + 540) % 360 - 180;
        return {
            lat: retlat,
            lng: retlng
        };
    },
    //Parses a text input.  Matches to BGA list, Welt2000 list, or lat/long input  Retrieves coordinates and name
    getPoint: function(instr) {
        var latitude;
        var longitude;
        var pointname = "Not named";
        var matchref;
        var statusmessage = "Fail";
        var count;
        var coords = {};
        var pointregex = [
            /^([A-Za-z]{2}[A-Za-z0-9]{1})$/,
            /^([A-Za-z0-9]{6})$/,
            /^([\d]{2})([\d]{2})([\d]{3})([NnSs])([\d]{3})([\d]{2})([\d]{3})([EeWw])(.*)$/,
            /^([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2})[\s]*([NnSs])[\W]*([0-9]{1,3}):([0-9]{1,2}):([0-9]{1,2})[\s]*([EeWw])$/,
            /^(\d{1,2})[\s:](\d{1,2})\.(\d{1,3})\s*([NnSs])\s*(\d{1,3})[\s:](\d{1,2})\.(\d{1,3})\s*([EeWw])$/
        ];

        var onFindTpSuccess = function(data) {
            pointname = data.tpname;
            if (pointname !== "Not found") {
                latitude = data.latitude;
                longitude = data.longitude;
                statusmessage = "OK";
            }
        };

        for (count = 0; count < pointregex.length; count++) {
            matchref = instr.match(pointregex[count]);
            if (matchref) {
                switch (count) {
                    case 0:
                    case 1:
                        //BGA or Welt2000 point
                        $.ajax({
                            url: "findtp.php",
                            data: {
                                postdata: matchref[0]
                            },
                            timeout: 3000,
                            method: "POST",
                            dataType: "json",
                            async: false, //must be synchronous as order in which points are returned is important
                            success: onFindTpSuccess
                        });
                        break;
                    case 2:
                        //format in IGC file
                        latitude = parseFloat(matchref[1]) + parseFloat(matchref[2]) / 60 + parseFloat(matchref[3]) / 60000;
                        if (matchref[4].toUpperCase() === "S") {
                            latitude = -latitude;
                        }
                        longitude = parseFloat(matchref[5]) + parseFloat(matchref[6]) / 60 + parseFloat(matchref[7]) / 60000;
                        if (matchref[8].toUpperCase() === "W") {
                            longitude = -longitude;
                        }
                        if (matchref[9].length > 0) {
                            pointname = matchref[9];
                        }
                        if ((latitude !== 0) && (longitude !== 0)) {
                            statusmessage = "OK";
                        }
                        break;
                    case 3:
                        //hh:mm:ss
                        latitude = parseFloat(matchref[1]) + parseFloat(matchref[2]) / 60 + parseFloat(matchref[3]) / 3600;
                        if (matchref[4].toUpperCase() === "S") {
                            latitude = -latitude;
                        }
                        longitude = parseFloat(matchref[5]) + parseFloat(matchref[6]) / 60 + parseFloat(matchref[7]) / 3600;
                        if (matchref[8].toUpperCase() === "W") {
                            longitude = -longitude;
                        }
                        break;
                    case 4:
                        latitude = parseFloat(matchref[1]) + parseFloat(matchref[2]) / 60 + parseFloat(matchref[3]) / (60 * (Math.pow(10, matchref[3].length)));
                        if (matchref[4].toUpperCase() === "S") {
                            latitude = -latitude;
                        }
                        longitude = parseFloat(matchref[5]) + parseFloat(matchref[6]) / 60 + parseFloat(matchref[7]) / (60 * (Math.pow(10, matchref[7].length)));
                        if (matchref[8].toUpperCase() === "W") {
                            longitude = -longitude;
                        }
                        statusmessage = "OK";
                        break;
                }
            }
        }
        coords.lat = latitude;
        coords.lng = longitude;
        return {
            message: statusmessage,
            coords: coords,
            name: pointname
        };
    },
    getLocalInfo: function(start, coords, zone, recall) {
        semaphore = 2;
        getBaseElevation(coords, recall);
        gettimezone(start, coords, zone, recall);
    },

    kasaRegress: function(xVectors, yVectors, xMean, yMean) { //Kasa method for circular regression
        var i;
        var xi;
        var yi;
        var mxx = 0;
        var myy = 0;
        var zi;
        var mxy = 0;
        var mxz = 0;
        var myz = 0;
        var g12;
        var g22;
        var d1;
        var d2;
        var xOffset;
        var yOffset;
        var centreX;
        var centreY;
        var magnitude;
        var direction;

        for (i = 0; i < xVectors.length; i++) {
            xi = xVectors[i] - xMean;
            yi = yVectors[i] - yMean;
            mxx += xi * xi;
            myy += yi * yi;
            zi = xi * xi + yi * yi;
            mxy += xi * yi;
            mxz += xi * zi;
            myz += yi * zi;
        }
        mxx /= xVectors.length;
        myy /= xVectors.length;
        mxy /= xVectors.length;
        mxz /= xVectors.length;
        myz /= xVectors.length;
        g11 = Math.sqrt(mxx);
        g12 = mxy / g11;
        g22 = Math.sqrt(myy - g12 * g12);
        d1 = mxz / g11;
        d2 = (myz - g12 * d1) / g22;
        yOffset = d2 / g22 / 2;
        xOffset = (d1 - yOffset * g12) / g11 / 2;
        centreX = xOffset + xMean;
        centreY = yOffset + yMean;
        magnitude = Math.sqrt(centreX * centreX + centreY * centreY);
        direction = 180 * Math.atan(centreX / centreY) / Math.PI;
        if (centreY > 0) {
            direction = (direction + 180) % 360;
        }
        else {
            direction = (direction + 360) % 360;
        }
        return {
            magnitude: magnitude,
            direction: direction
        };
    },

    getEarthSize: function() {
        return EARTHRAD;
    },

    getElevation: function(coords, recall, index, glideralt) {
        var elevation;
		
		    $.ajax({
            url: "/getelevation.php",
            data: {
                lat: coords.lat,
                lng: coords.lng
            },
            timeout: 5000,
            method: "GET",
            dataType: "json"
        })
        .done(function(result) {
			try {
				data = (typeof(result)==='object') ? result: JSON.parse(result);
				//data = JSON.parse(result);
				if (typeof(data.astergdem) !== 'undefined') {
					elevation = data.astergdem;
				}
				else {
					elevation = null;
				}
			}
			catch(err) {
				elevation=null;
			}
        })
        .fail(function() {
            elevation = null;
        })
        .always(function() {
                recall(elevation, index, glideralt);
        });
		
    },
	getHeading: function(fromPoint, toPoint) {
	// get the (approximate) heading in degrees between two points
	// simple calc for speed
	var heading = 0;
	if (fromPoint && toPoint) {
		var latA = fromPoint.lat * Math.PI/180;
		var lonA = fromPoint.lng * Math.PI / 180;
		var latB = toPoint.lat * Math.PI / 180;
		var lonB = toPoint.lng * Math.PI / 180;
		heading = 180 * (Math.atan2(Math.sin(lonB - lonA) * Math.cos(latB),Math.cos(latA) * Math.sin(latB) - Math.sin(latA)*Math.cos(latB) * Math.cos(lonB-lonA)) % (2 * Math.PI))/ (Math.PI);
	}
	return heading;
	}

};
