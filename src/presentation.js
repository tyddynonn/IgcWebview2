(function() {
    //This module handles all presentation tasks that are in simple html- ie: excluding the map and graph
    "use strict";
    var flight = require('./igc');
    var prefs = require('./preferences');
    var utils = require('./utilities');
    var mapControl = require('./mapctrl.js');
    var barogram = require('./plotgraph');
    var task = require('./task.js');
    var planWindow;

     var measureTool = {
        status: 'empty',
        start: null,
        end: null
    };

    function measureClick(lat, lng) {
        var coords = {
            lat: lat,
            lng: lng
        };
        var calc;
        switch (measureTool.status) {
            case 'empty':
                mapControl.showStart(coords);
                $('#measure1').html("Start: " + utils.showFormat(coords));
                $('#measure2').text("Click on finish point");
                measureTool.status = 'started';
                measureTool.start = coords;
                break;
            case 'started':
                mapControl.showFinish(coords);
                measureTool.end = coords;
                calc = utils.getTrackData(measureTool.start, measureTool.end);
                $('#measure2').html("Finish: " + utils.showFormat(coords));
                $('#measure3').html("Distance: " + prefs.showDistance(calc.distance) + "<br/>Initial bearing: " + calc.bearing + "&deg;");
                break;
        }
    }
    
    function zapTask() {
        $('#taskentry').hide();
        $('#task').hide();
        $('#taskbuttons').html('');
        task.clearTask();
        mapControl.zapTask();
    }

    function waitForMap(interval, counter) {
        if (window.haveMap) {
            return;
        }
        else {
            counter++;
            if (counter > 10) {
                alert("Map Load Failed");
                return;
            }
            else {
                setTimeout(function() {
                    waitForMap(interval, counter);
                });
            }
        }
    }

    function enterTask(points, zoomto) {
        task.createTask(points);
        var distance = task.getTaskLength();
        var i;
        var pointlabel;
        $('#taskbuttons').html("");
        $('#taskinfo').html("");
        for (i = 0; i < task.labels.length; i++) {
            $('#taskinfo').append('<tr><th>' + task.labels[i] + ':</th><td>' + task.names[i] + ':</td><td>' + utils.showFormat(task.coords[i]) + '</td></tr>');
            switch (i) {
                case 0:
                    pointlabel = "Start";
                    break;
                case task.labels.length - 1:
                    pointlabel = "Finish";
                    break;
                default:
                    pointlabel = "TP" + i.toString();
            }
            $('#taskbuttons').append("&nbsp;<button class='zoombutton'>" + pointlabel + '</button>');
        }
        $('#tasklength').text("Task distance: " + prefs.showDistance(distance));
        $('#task').show();
        $('#zoomlabel').show();
        mapControl.addTask(points, zoomto);
        $('#map').css('visibility', 'visible');
        $('#taskbuttons button').on('click', function(event) {
            var li = $(this).index();
            mapControl.showTP(task.coords[li]);
            $('#zoomdiv').css('zIndex', 1);
        });
    }

    function showLocalTime(index) {
        return utils.unixToString((flight.recordTime[index] + flight.timeZone.offset + 86400) % 86400);
    }

    function displayHeaders(headerList) {
        var headerBlock = $('#headers');
        var headerIndex;
        headerBlock.html('');
        //force word-wrap after commas by inserting zero-width space- relevant to small screens
        for (headerIndex = 0; headerIndex < headerList.length; headerIndex++) {
            headerBlock.append('<tr><th>' + headerList[headerIndex].name + ":  </th><td>" + headerList[headerIndex].value.replace(',', ',&#8203;') + "</td></tr>");
        }
    }

    function getFromPlanner(source) {
        var planUrl = "../xcwebplan/xcplan.php?version=" + source;
        if ((!(planWindow)) || (planWindow.closed)) {
            planWindow = window.open(planUrl, "_blank");
        }
        planWindow.focus();
    }

    module.exports = {

        setSectors: function() {
            var sectors = {
                startrad: $('#startrad').val(),
                finrad: $('#finishrad').val(),
                tprad: $('#tpbarrelrad').val(),
                sector_rad: $('#tpsectorrad').val(),
                sector_angle: $('#subtends').val(),
                use_sector: $('#tpsector').prop('checked'),
                use_barrel: $('#tpbarrel').prop('checked'),
                finishtype: $("input[name=finishtype]:checked").val()
            };
            var saveit = $('#savesectors').prop('checked');
            if (prefs.setSectors(sectors, saveit)) {
                if (task) {
                    task.setLength();
                    $('#tasklength').text("Task distance: " + prefs.showDistance(task.getTaskLength()));
                }
                mapControl.addSectors();
                $('#sectordefs').hide();
            }
        },

        setEnlPrefs: function() {
            var enl = {
                detect: $("input[name=enldetect]:checked").val(),
                threshold: $('#enlthreshold').val(),
                duration: $('#enltime').val()
            };
            var saveit = $('#saveenl').prop('checked');
            if (prefs.setEnl(enl, saveit)) {
                if (flight.recordTime.length > 0) {
                    flight.getEngineRuns(enl);
                    mapControl.showEngineRuns(flight.engineRunList);
                    barogram.plot();
                }
            }
        },

        showImported: function(points) {
            enterTask(points, true);
        },

        showSectorPreferences: function(origin) {
            var sectorObj;
            if (origin === 'current') {
                sectorObj = prefs.sectors;
            }
            else {
                sectorObj = prefs.sectorDefaults;
            }
            $('#startrad').val(sectorObj.startrad);
            $('#finishrad').val(sectorObj.finrad);
            $('#tpbarrelrad').val(sectorObj.tprad);
            $('#tpsectorrad').val(sectorObj.sector_rad);
            $('#subtends').val(sectorObj.sector_angle);
            if (sectorObj.use_sector) {
                $('#tpsector').prop('checked', true);
            }
            if (sectorObj.use_barrel) {
                $('#tpbarrel').prop('checked', true);
            }
            if (sectorObj.finishtype === 'line') {
                $("input[name=finishtype][value='line']").prop("checked", true);
            }
            else {
                $("input[name=finishtype][value='circle']").prop("checked", true);
            }
        },

        showEnlPrefs: function(origin) {
            var enlObj;
            if (origin === 'current') {
                enlObj = prefs.enlPrefs;
            }
            else {
                enlObj = prefs.enlDefaults;
            }
            if (enlObj.detect === 'On') {
                $("input[name=enldetect][value='On']").prop("checked", true);
            }
            else {
                $("input[name=enldetect][value='Off']").prop("checked", true);
            }
            $('#enlthreshold').val(enlObj.threshold),
                $('#enltime').val(enlObj.duration);
        },

        showPreferences: function() {
            $('#altitudeunits').val(prefs.units.altitude);
            $('#lengthunits').val(prefs.units.distance);
            $('#climbunits').val(prefs.units.climb);
            $('#cruiseunits').val(prefs.units.cruise);
            $('#taskunits').val(prefs.units.task);
            $('#airclip').val(prefs.airclip);
            this.showSectorPreferences('current');
            this.showEnlPrefs('current');
            this.showAltPreferences();
        },

        getUserTask: function() {
            var input;
            var pointdata;
            var success = true;
            var taskdata = {
                coords: [],
                names: []
            };
            $("#requestdata :input[type=text]").each(function() {
                input = $(this).val().replace(/ /g, '');
                if (input.length > 0) {
                    pointdata = utils.getPoint(input);
                    if (pointdata.message === "OK") {
                        taskdata.coords.push(pointdata.coords);
                        taskdata.names.push(pointdata.name);
                    }
                    else {
                        success = false;
                        alert("\"" + $(this).val() + "\"" + " not recognised-" + " ignoring entry");
                    }
                }
            });
            if (success === true) {
                if (taskdata.names.length > 1) {
                    enterTask(taskdata, true);
                }
                $('#taskentry').hide();
            }
        },

        replaceTask: function(source) {
            var taskpoints = null;
            $('#taskentry').hide();
            $('#task').hide();
            switch (source) {
                case 'igc':
                    if (flight.latLong.length > 0) {
                        if (flight.taskpoints.names.length > 1) {
                            taskpoints = flight.taskpoints;
                            enterTask(taskpoints, false);
                        }
                        else {
                            alert("No task found in IGC file");
                        }
                    }
                    break;
                case 'user':
                    $('#taskentry').show();
                    break;
                case 'world':
                    getFromPlanner('world');
                    break;
                case 'uk':
                    getFromPlanner('uk');
                    break;
                case 'nix':
                    zapTask();
                    break;
            }
        },

        showPosition: function(index) {
            var flightMode = "Transition";
            var climbRate = flight.getClimb(index);
            var altInfo = prefs.showAltitude(flight.pressureAltitude[index], flight.gpsAltitude[index], flight.takeOff.pressure, flight.takeOff.gps, flight.baseElevation);
            var displaySentence = "<b>Time:</b>&nbsp;" + showLocalTime(index) + "&nbsp;" + flight.timeZone.zoneAbbr + ":";
            displaySentence += "  <b>Position:</b>&nbsp;" + utils.showFormat(flight.latLong[index]) + ":";

            var takeOffIndex = flight.getTakeOffIndex();
            var landingIndex = flight.getLandingIndex();
            if (index < takeOffIndex) {
                flightMode = "Pre&nbsp;take&nbsp;off";
            }
            else {
                if (index > landingIndex) {
                    flightMode = "Landed";
                }
                else {
                    var turn = Math.abs(flight.turnRate[index]);
                    if (turn > 5) {
                        flightMode = "Circling";
                    }
                    else {
                        $('#thermal').hide();
                    }
                    if (turn < 4) {
                        flightMode = "Cruising";
                    }
                }
            }
            if (flightMode === 'Circling') {
                $('#thermal').show();
            }
            else {
                $('#thermal').hide();
            }
            if (flightMode) {
                displaySentence += " <b>Flight&nbsp;mode:</b>&nbsp;" + flightMode + ":";
            }
            displaySentence += " <b>Altitude:</b>&nbsp;" + altInfo.displaySentence + ":";
            if (climbRate !== null) {
                displaySentence += " <b>Vario:</b>&nbsp;" + prefs.showClimb(climbRate) + ":";
            }
            if (flightMode === "Cruising") {
                displaySentence += " <b>Ground&nbsp;speed:</b>&nbsp;" + prefs.showCruise(flight.groundSpeed[index]);
            }
            $('#timePositionDisplay').html(displaySentence);
            var xval = 1000 * (flight.recordTime[index] + flight.timeZone.offset);
            var yval = altInfo.altPos;
			// CF181229 - add heading info...
			var heading = (index > 0) ? utils.getHeading(flight.latLong[index-1], flight.latLong[index]) : 0
            mapControl.setTimeMarker(flight.latLong[index], heading);
            barogram.lockCrosshair({
                x: xval,
                y: yval
            });
        },

        altChange: function(index) {
            if (flight.latLong.length > 0) {
                barogram.plot();
                this.showPosition(index);
            }
        },

        airClipChange: function() {
            mapControl.showAirspace();
        },

        lengthChange: function() {
            var distance = task.getTaskLength();
            $('#tasklength').text("Task distance: " + prefs.showDistance(distance));
        },

        getGeoInfo: function(elevation) {
            if (elevation === null) {
                var message = "Start elevation not available.";
                $('#QNH').attr('disabled', true);
                $('#QFE').attr('disabled', false);
                if (prefs.altPrefs.altref === 'QNH') {
                    message += " Using QFE";
                    prefs.altPrefs.altref = 'QFE';
                    $('#QFE').prop('checked', true);
                }
                alert(message);
            }
            else {
                $('#QNH').attr('disabled', false);
                flight.baseElevation = elevation;
            }
            barogram.plot();
            $('#datecell').text(utils.showDate(flight.unixStart[0] + flight.timeZone.offset));
            this.showPosition(0);
        },

        displayIgc: function() {
            $('#flightInfo').show();
            if (flight.takeOff.pressure === null) {
                $('#P').attr('disabled', true);
                $('#G').attr('disabled', false);
                if (prefs.altPrefs.altsource === 'P') {
                    alert("Pressure altitude not available. Using GPS");
                    prefs.altPrefs.altsource = 'G';
                    $('#G').prop('checked', true);
                }
            }
            else {
                $('#P').attr('disabled', false);
            }
            waitForMap(10, 0); //Map load is asyncronous- need to check it's available
            $('#righthalf').css('visibility', 'visible');
            $('#infobox').css('visibility', 'visible');
            var tzBack = this.getGeoInfo.bind(this);
            utils.getLocalInfo(flight.unixStart[0], flight.latLong[0], flight.timeZone, tzBack);
            displayHeaders(flight.headers);
            $('#timeSlider').val(0);
            $('#timeSlider').prop('max', flight.recordTime.length - 1);
            mapControl.setBounds(flight.bounds);
            $('#mapWrapper').css('visibility', 'visible');
            $.when(utils.getAirspace(flight.bounds, 20)).done(function(args) {
                mapControl.setAirspace(args);
                mapControl.showAirspace();
            });
            mapControl.addTrack(flight.latLong);
            $('#zoomtrack').show();
            if (prefs.enlPrefs.detect === 'On') {
                flight.getEngineRuns(prefs.enlPrefs);
                mapControl.showEngineRuns(flight.engineRunList);
            }
            if (prefs.tasksource === 'igc') {
                if (flight.taskpoints.names.length > 1) {
                    enterTask(flight.taskpoints, false);
                }
                else {
                    zapTask();
                }
            }
            document.getElementById('map').scrollIntoView();
            $('#timeSlider').val(0);
            $('#timeSlider').prop('max', flight.recordTime.length - 1);
        },

        zoomTrack: function() {
            if (flight) {
                mapControl.setBounds(flight.bounds);
            }
            $('#zoomdiv').css('zIndex', 1);
        },

        showAltPreferences: function() {
            var altSource = prefs.altPrefs.altsource;
            $('#' + altSource).prop('checked', true);
            var altRef = prefs.altPrefs.altref;
            $('#' + altRef).prop('checked', true);
        },

        reportFlight: function() {
            $('#sectordefs').hide();
            $('taskcalcs').text('');
            $('#taskdata').show();
            var takeOffIndex = flight.getTakeOffIndex();
            var landingIndex = flight.getLandingIndex();
            var altValue = [];
            var altLoss;
            var taskEndIndex;
            var taskData;
            var analyse = require('./analyse');

            $('#taskcalcs').html("Take off:  " + showLocalTime(takeOffIndex) + "<br>");
            if (task.coords.length > 1) {
                taskData = analyse.assessTask();
                var i;
                for (i = 0; i < task.coords.length; i++) {
                    $('#taskcalcs').append("<br/>" + task.labels[i] + ": ");
                    if (i < taskData.npoints) {
                        $('#taskcalcs').append(showLocalTime(taskData.turnIndices[i]) + ": Altitude: ");
                        altValue[i] = prefs.showAltitude(flight.pressureAltitude[taskData.turnIndices[i]], flight.gpsAltitude[taskData.turnIndices[i]], flight.takeOff.pressure, flight.takeOff.gps, flight.baseElevation);
                        $('#taskcalcs').append(altValue[i].altPos + altValue[i].descriptor);
                    }
                    else {
                        $('#taskcalcs').append("No control");
                    }
                }
                if (taskData.npoints === task.coords.length) { //task completed
                    mapControl.clearPin();
                    $('#taskcalcs').append("<br/><br/>" + prefs.showDistance(task.getTaskLength()) + "  task completed");
                    taskEndIndex = taskData.turnIndices[taskData.npoints - 1];
                    var elapsedTime = flight.recordTime[taskEndIndex] - flight.recordTime[taskData.turnIndices[0]];
                    $('#taskcalcs').append("<br/>Elapsed time: " + utils.unixToPaddedString(elapsedTime));
                    $('#taskcalcs').append("<br/>Speed: " + prefs.showTaskSpeed(3600 * task.getTaskLength() / elapsedTime));
                    altLoss = altValue[0].altPos - altValue[task.coords.length - 1].altPos;
                    $('#taskcalcs').append("<br/>Height loss: " + altLoss + " " + altValue[0].descriptor);
                    if (prefs.units.altitude !== 'mt') {
                        if (prefs.altPrefs.source === 'P') {
                            altLoss = flight.pressureAltitude[taskData.turnIndices[0]] - flight.pressureAltitude[taskData.turnIndices[task.coords.length - 1]];
                        }
                        else {
                            altLoss = flight.gpsAltitude[taskData.turnIndices[0]] - flight.gpsAltitude[taskData.turnIndices[task.coords.length - 1]];
                        }
                        $('#taskcalcs').append(" (" + altLoss + "m)");
                    }
                }
                else { // GPS landout
                    if (taskData.npoints > 0) {
                        taskEndIndex = taskData.bestPoint;
                        $('#taskcalcs').append("<br/><br/>\"GPS Landing\" at: " + showLocalTime(taskData.bestPoint));
                        $('#taskcalcs').append("<br/>Position: " + utils.showFormat(flight.latLong[taskData.bestPoint]));
                        $('#taskcalcs').append("<br/>Scoring distance: " + prefs.showDistance(taskData.scoreDistance));
                        mapControl.pushPin(flight.latLong[taskData.bestPoint]);
                    }
                }
            }
            $('#taskcalcs').append("<br/><br/>Landing: " + showLocalTime(landingIndex));
            var flightSeconds = flight.recordTime[landingIndex] - flight.recordTime[takeOffIndex];
            $('#taskcalcs').append("<br/><br/>Flight time: " + Math.floor(flightSeconds / 3600) + "hrs " + utils.pad(Math.round(flightSeconds / 60) % 60) + "mins");
            if (taskData.npoints > 0) {
                var thermalInfo = analyse.getThermalCount(taskData.turnIndices[0], taskEndIndex);
                $('#taskcalcs').append("<br/><br/><b>On Task: </b>");
                $('#taskcalcs').append("<br/>Time  circling: " + Math.floor(thermalInfo.circleTime / 60) + " mins " + thermalInfo.circleTime % 60 + " secs");
                var altInfo = prefs.displayAlt(thermalInfo.heightGain);
                $('#taskcalcs').append("<br/>Height gained: " + altInfo.showval + " " + altInfo.descriptor);
                if (thermalInfo.circleTime > 0) {
                    $('#taskcalcs').append("<br/>Average climb: " + prefs.showClimb(thermalInfo.heightGain / thermalInfo.circleTime));
                }
                $('#taskcalcs').append("<br/><br/>Task wind: " + prefs.showCruise(thermalInfo.windSpeed) + " from " + Math.round(thermalInfo.windDirection) + "&deg;");
            }
        },

        showQfe: function(elevation, index, glideralt) {
            var displayValue;
            if (elevation !== null) {
                if (flight.takeOff.pressure === null) {
                    displayValue = flight.gpsAltitude[index] - flight.takeOff.gps + flight.baseElevation - elevation;
                }
                else {
                    displayValue = flight.pressureAltitude[index] - flight.takeOff.pressure + flight.baseElevation - elevation;
                }
                var showQnh = prefs.displayAlt(displayValue);
                $('#heightAGL').text("Height above ground: " + showQnh.showval + showQnh.descriptor);
                var showElev = prefs.displayAlt(elevation);
                $('#terrain').text(showElev.showval + showElev.descriptor);
                $('#htAgl').text((glideralt - showElev.showval) + showElev.descriptor);
            }
        },

        reportThermal: function(index) {
            var heightGain;
            var thermalData = flight.getThermalInfo(index);
            var analyse = require('./analyse');
            var windInfo = analyse.getWindInfo(thermalData.entryIndex, thermalData.exitIndex);
            var entryHeight = prefs.showAltitude(flight.pressureAltitude[thermalData.entryIndex], flight.gpsAltitude[thermalData.entryIndex], flight.takeOff.pressure, flight.takeOff.gps, flight.baseElevation);
            var exitHeight = prefs.showAltitude(flight.pressureAltitude[thermalData.exitIndex], flight.gpsAltitude[thermalData.exitIndex], flight.takeOff.pressure, flight.takeOff.gps, flight.baseElevation);
            $('#thermalEntry').text(utils.unixToString(thermalData.entryTime) + " at " + entryHeight.altPos + entryHeight.descriptor);
            $('#thermalExit').text(utils.unixToString(thermalData.exitTime) + " at " + exitHeight.altPos + exitHeight.descriptor);
            $('#thermalGain').text((exitHeight.altPos - entryHeight.altPos) + entryHeight.descriptor + " in " + utils.unixToPaddedString(thermalData.exitTime - thermalData.entryTime));
            if (flight.takeOff.pressure === null) {
                heightGain = flight.gpsAltitude[thermalData.exitIndex] - flight.gpsAltitude[thermalData.entryIndex];
            }
            else {
                heightGain = flight.pressureAltitude[thermalData.exitIndex] - flight.pressureAltitude[thermalData.entryIndex];
            }
            $('#thermalClimb').text(prefs.showClimb(heightGain / (thermalData.exitTime - thermalData.entryTime)));
            $('#windInfo').text(prefs.showCruise(windInfo.speed) + " from " + Math.round(windInfo.direction));
        },

       resetMeasure: function() {
            $('#measurer p').text('');
            $('#measure1').text("Click on start point");
            measureTool.status = 'empty';
            measureTool.start = null;
            measureTool.finish = null;
            mapControl.clearMeasureFlags();
        },

        measure: function() {
            this.resetMeasure();
            $('#measurer').show();
            mapControl.activate(measureClick);
        },

        zapMeasure: function() {
            mapControl.unclick();
        },
 
        reportHeightInfo: function(index) {
            var qnhMetric;
            var qnh;
            if (flight.baseElevation !== null) {
                if (flight.takeOff.pressure === null) {
                    qnhMetric = flight.gpsAltitude[index] - flight.takeOff.gps + flight.baseElevation;
                }
                else {
                    qnhMetric = flight.pressureAltitude[index] - flight.takeOff.pressure + flight.baseElevation;
                }
                qnh = prefs.displayAlt(qnhMetric);
                $('#qnh').text(qnh.showval + qnh.descriptor + " asl");
                var elBack = this.showQfe.bind(this);
                utils.getElevation(flight.latLong[index], elBack, index, qnh.showval);
            }
        }
    };
})();
