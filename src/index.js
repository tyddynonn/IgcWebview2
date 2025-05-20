// This is the entry point for the build.  Contains basic user interaction code.
(function() {
    var apiKeys = require('./apikeys');
    window.ginit = function() { //Callback after maps api loads.  Must be in global scope
        $('#mapWrapper').show();
        var map = require('./mapctrl');
        window.haveMap = map.initmap();
    };

    window.importTask = function(points) {
        debugger;
        var present = require('./presentation');
        present.showImported(points);
        return "Task Entered";
    };
 
    window.name="igcview";
 
    var doit;

	
    //var script = document.createElement('script');
    //script.type = 'text/javascript';
	//script.src='/Leaflet/leaflet.src'
    //script.src = 'https://maps.googleapis.com/maps/api/js?v=3&key=' + apiKeys.googleMaps + '&callback=ginit';
    //document.body.appendChild(script);

    function hiderest() {
        $('.easyclose').hide();
    }

    $(function() {
        var preference = require('./preferences');
        var present = require('./presentation');
        var igcFile = require('./igc');
        preference.getStoredValues();
        present.showPreferences();
        document.getElementById('help').scrollIntoView();
		
		ginit();
		
        $("#igc").prop("checked", true); //Firefox ignores markup on refresh

        $('#help').on('click',function() {
            window.open("igchelp.html", "_blank");
        });

        $('#about').on('click',function() {
            window.open("igcabout.html", "_blank");
        });

        $('#fileControl').on('change',function() {
            if (this.files.length > 0) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        igcFile.initialise(this.result);
                        present.displayIgc();
                    }
                    catch (ex) {
                        if (ex instanceof igcFile.IGCException) {
                            alert(ex.message);
                        }
                        else {
                            throw ex;
                        }
                    }
                };
                reader.readAsText(this.files[0]);
            }
        });

        var resizedw = function() {
            if ($('#righthalf').css('visibility') === 'visible') {
                var plot = require('./plotgraph');
                var mapctrl = require('./mapctrl');
                plot.replot();
                mapctrl.resizeMap();
            }
        };

        window.onresize = function() {
            clearTimeout(doit);
            doit = setTimeout(resizedw, 100);
        };

        $('.closewindow').on('click',function() {
            $('.easyclose').hide();
            $('#timeSlider').focus();
        });

        $('#timeSlider').on('input', function() {
            hiderest();
            var t = parseInt($(this).val(), 10);
            present.showPosition(t);
        });

        $('#timeSlider').on('change', function() {
            hiderest();
            var t = parseInt($(this).val(), 10);
            present.showPosition(t);
        });

        $('#zoomtrack').on('click',function() {
            present.zoomTrack();
        });

        $('#airclip').on('change',function() {
            preference.setAirclip($(this).val());
            present.airClipChange();
        });

        $('#altitudeunits').on('change',function() {
            preference.setAltUnits($(this).val());
            present.altChange(parseInt($('#timeSlider').val(), 10));
        });

        $('#climbunits').on('change',function() {
            preference.setClimbUnits($(this).val());
            if (igcFile.recordTime.length > 0) {
                var t = parseInt($('#timeSlider').val(), 10);
                present.showPosition(t);
            }
        });

        $('#lengthunits').on('change',function() {
            preference.setLengthUnits($(this).val());
            present.lengthChange();
        });

        $('#cruiseunits').on('change',function() {
            preference.setCruiseUnits($(this).val());
        });

        $('#taskunits').on('change',function() {
            preference.setTaskUnits($(this).val());
        });

        $('#unitconfig').on('click',function() {
            hiderest();
            $('#setunits').show();
        });

        $('#enterTask').on('click',function() {
            present.getUserTask();
        });

        $('input[type=radio][name=tasksource]').on('change',function() {
            preference.setTaskSource(this.id);
            present.replaceTask(this.id);
        });

        $('#sectorconfig').on('click',function() {
            hiderest();
            $('#sectordefs').show();
        });

        $('#tpdefaults').on('click',function() {
            present.showSectorPreferences('default');
        });

        $('#setsectors').on('click',function() {
            present.setSectors();
        });

        $('#tpdefaults').on('click',function() {
            preference.setSectorDefaults();
            present.showSectorPreferences();
        });

        $('#enl').on('click', function() {
            hiderest();
            $('#setenl').show();
        });

        $('#enldefaults').on('click',function() {
            present.showEnlPrefs('default');
            present.showMopPrefs('default');
        });

        $('#enlhelp').on('click',function() {
            window.open("igchelp.html#enl", "_blank");
        });

        $('#applyenl').on('click', (function() {
            present.setEnlPrefs();
            present.setMopPrefs();
        }));

        $('#cancelenl').on('click',function() {
            present.showEnlPrefs();
        });

        $('#altref').on('click',function() {
            hiderest();
            $('#setaltref').show();
        });

        $('#althelp').on('click',function() {
            window.open("igchelp.html#alt", "_blank");
        });

        $('#restorealtref').on('click',function() {
            present.showAltPreferences();
        });

        $('#analyse').on('click',function() {
            hiderest();
            present.reportFlight();
        });

        $('#height').on('click',function() {
            hiderest();
            $('#heightDetail').show();
            var t = parseInt($('#timeSlider').val(), 10);
            present.reportHeightInfo(t);
        });

        $('#thermal').on('click',function() {
            hiderest();
            $('#thermalDetail').show();
            var t = parseInt($('#timeSlider').val(), 10);
            present.reportThermal(t);
        });

        $('#applyaltref').on('click',function() {
            preference.setAltPrefs($("input[name='alttype']").filter(':checked').val(), $("input[name='altsource']").filter(':checked').val());
            present.altChange(parseInt($('#timeSlider').val(), 10));
        });

        $('#showgraph').on('click',function() {
            $(this).parent().hide();
            $('#map').css('zIndex', 1);
            $('#barogram').css('zIndex', 10);
            $('#showmap').show();
        });

        $('#showmap').on('click',function() {
            $('#map').css('zIndex', 10);
            $('#barogram').css('zIndex', 1);
            $('#mapbuttons').show();
            $(this).hide();
        });

        $('#showzoom').on('click',function() {
            $('#zoomdiv').css('zIndex', 25);
            $('#zoomlabel').hide();
        });

           $('#measure').on('click',function() {
            present.measure();
        });

        $('#measurer :button').on('click',function() {
            present.resetMeasure();
        });

        $('#closemeasure').on('click',function() {
            present.zapMeasure();
        });
        
        $('button.toggle').on('click',
            function() {
                $(this).next().toggle();
                if ($(this).next().is(':visible')) {
                    $(this).text('Hide');
                }
                else {
                    $(this).text('Show');
                }
            });
			
		// check if a URL to a logger file was provided...
		const urlParams= new URLSearchParams(window.location.search);		
		var igcURL = urlParams.get('igc');
	
		if (igcURL) {
				var request = new XMLHttpRequest();
				request.open('GET', igcURL, true);
				request.responseType = 'blob';
				request.onload = function() {
					loadIGC(request.response);
				};
			request.send();
		}
		
		function loadIGC(igc) {		
			var reader = new FileReader();
			reader.readAsText(igc);
			reader.onload = function(e) {
				try {
					igcFile.initialise(this.result);
					present.displayIgc();
				}
				catch (ex) {
					if (ex instanceof igcFile.IGCException) {
						alert(ex.message);
					}
					else {
						throw ex;
					}
				}
			};
		}

		
    });		// document.ready
})();
