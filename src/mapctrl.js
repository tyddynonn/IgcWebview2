(function() {
    //Wrapper for the Leaflet api
	var leaflet = require('leaflet');
	var rm = require('leaflet-rotatedmarker')
    var vg = require('leaflet.vectorgrid/dist/Leaflet.VectorGrid.bundled');

	
    var map = {};
    var trackline;
    var gliderMarker;
    var taskfeatures = [];
    var sectorfeatures = [];
    var airspace = {
        polygons: [],
        circles: [],
        polygon_bases: [],
        circle_bases: []
    };
    var engineLines = [];
    var pin;
	var savedcursor;
	
    function putMarker(marker, coords) {
        marker.setLatLng(coords);
        marker.addTo(map);
    }
    
    function deleteEnl() {
        var i;
        for (i = 0; i < engineLines.length; i++) {
			map.removeLayer(engineLines[i]);
        }
        engineLines = [];
    }


    function getLineBounds(line) {
		return line.getBounds();
    }

    function zapAirspace() {
        var i;
        var j;

        for (i = 0; i < airspace.polygons.length; i++) {
			map.removeLayer(airspace.polygons[i]);
            airspace.polygons[i] = null;
        }
        airspace.polygons.length = 0;
        airspace.polygon_bases.length = 0;
        for (j = 0; j < airspace.circles.length; j++) {
			map.removeLayer(airspace.circles[j]);
            airspace.circles[j] = null;
        }
        airspace.circles.length = 0;
        airspace.circle_bases.length = 0;
    }

    function zapSectors() {
        var i;
        for (i = 0; i < sectorfeatures.length; i++) {
			map.removeLayer(sectorfeatures[i]);
        }
        sectorfeatures = [];
    }

    function drawLine(centre, bearing, length) {
        var utils = require('./utilities');
        var brng1 = (bearing + 270) % 360;
        var brng2 = (bearing + 90) % 360;
        var linestart = utils.targetPoint(centre, length, brng1);
        var lineend = utils.targetPoint(centre, length, brng2);
		
		var latlngs = [linestart, lineend];
		
		var targetLine = L.polyline(
			latlngs, 
			{
				color: 'black',
				weight: 2,
				opacity: 1
			}
		);
        return targetLine;
    }

    function sectorCircle(centre, radius) {
		// centre is object with props lat & lng
		
		var tpCircle = L.circle(
			centre,
			radius * 1000,
			{
				color: 'black',
				opacity: 0.8,
				fillColor: 'green',
				fillOpacity: 0.1,
				interactive: false,				
			}			
		);
		
        return tpCircle;
    }

    function drawSector(centre, bearingIn, bearingOut, angle, radius) {
        var j;
        var interval = 5;
        var polydef = [];
        var backbearing = (bearingOut + 180) % 360;
        var utils = require('./utilities');
        var bisector = bearingIn + (backbearing - bearingIn) / 2;
        if (Math.abs(backbearing - bearingIn) > 180) {
            bisector = (bisector + 180) % 360;
        }
        polydef.push(centre);
        var startangle = (bisector - angle / 2 + 360) % 360;
        polydef.push(utils.targetPoint(centre, radius, startangle));
        var endangle = (bisector + angle / 2 + 360) % 360;
        var interpoints = angle / interval - 1;
        var azi = startangle;

        for (j = 1; j < interpoints; j++) {
            azi += interval;
            polydef.push(utils.targetPoint(centre, radius, azi));
        }
        polydef.push(utils.targetPoint(centre, radius, endangle));
        polydef.push(centre);
		
		var sectorPoly = L.polygon(
			polydef,
			{
				color: 'black',
				opacity: 0.8,
				weight: 1,
				fillColor: 'green',
				fillOpacity: 0.1,
				interactive: false,	
			}
		);
        return sectorPoly;
    }
	

	
    module.exports = {
        initmap: function() {
			if (typeof (L) === 'undefined') return null;

            const LimaLabsKey = "1004KGgIweDGsd4uqlFwerGuDFGIT3HfsadOtwguQKERA01";
	
            var streetLayer = L.tileLayer(`https://cdn.lima-labs.com/{z}/{x}/{y}.png?api=${LimaLabsKey}`, {
                detectRetina: true,
                attribution: 'Map tiles by <a href="https://maps.lima-labs.com/">Lima Labs</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.'
            });

            var topoLayer = L.tileLayer('https://c.tile.opentopomap.org/{z}/{x}/{y}.png ', {
                detectRetina: true,
                attribution: 'Map: <a href="https://opentopomap.org" target="_blank">OpenTopoMap</a>'
            });
        
            var satLayer = L.tileLayer('https://wxs.ign.fr/pratique/wmts/?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image%2Fjpeg ', {
                detectRetina: true,
                attribution: 'Map: <a href="http://www.geoportail.gouv.fr/depot/api/cgu/CGU_API_libre.pdf" target="_blank">French Gov</a>'
            });

            const OpenAPIKey = '640b746f7681262160656acea48dbd91'

    // As of May 2023, the airspaces and airfields layers are subsumed into the general 'openaip' layer
            var openaipURL = `https://{s}.api.tiles.openaip.net/api/data/openaip/{z}/{x}/{y}.png?apiKey=${OpenAPIKey}`
  

            var airspaceURLpbf = `https://{s}.api.tiles.openaip.net/api/data/openaip/{z}/{x}/{y}.pbf?apiKey=${OpenAPIKey}`
            var mapstylesURL = `https://api.tiles.openaip.net/api/styles/openaip-default-style.json?apiKey=${OpenAPIKey}`
            
            var mapstyles;
            fetch(mapstylesURL)
            .then( response => {
                if (response.ok) {
                    return response.json()
                }})
            .then (result => {
                mapstyles = result
                console.log(`mapStyles fetched: `, mapstyles)   
            })

            var openAIPairspacepbf = L.vectorGrid.protobuf(airspaceURLpbf, {
                vectorTileLayerStyles: mapstyles,
                subdomains: "abc",
                maxNativeZoom: 14
            });


            var openAIP = L.tileLayer(openaipURL, {
                detectRetina: true,
                format: 'image/png',
                transparent: true,
                attribution: "Airspace by <a HREF=http://www.openaip.net>OpenAIP</a>t"
            });

            var OpenAIPLayers =  L.layerGroup([openAIP]);			

			map = L.map('map', {
				center: [54.5, -3],
				zoom: 5
			});



			var baseLayers = {
				"Street": streetLayer,
				"Topo": topoLayer,
				"Satellite": satLayer
			};
					
			var overlayLayers = {
				'Airspace': OpenAIPLayers,
			};
			L.control.layers(baseLayers, overlayLayers).addTo(map);

           


			baseLayers.Street.addTo(map);			

	
			gliderMarker = L.marker(L.latLng(0,0), {
				icon: L.icon({
					iconUrl: 'Icons/glider.png',
					iconSize: [30, 30],
					iconAnchor: [15, 15],
					zIndexOffset: 500,
					rotationOrigin: 'center center'
				})
			});


            var pinIcon = L.icon({
                iconUrl: 'Icons/pin.png',
                iconAnchor: [4, 48]
            });
            
            var finishIcon = L.icon({
                iconUrl: 'Icons/finish.png',
				iconAnchor: [0,30]
            });

            var startIcon = L.icon({
                iconUrl: 'Icons/start.png',
				iconAnchor: [5,30]
            });

			pin = L.marker(L.latLng(0,0), {
				icon: pinIcon,
				interactive: false
				});
           
			finishFlag = L.marker(L.latLng(0,0), {
				icon: finishIcon,
				interactive: false
				});

            startFlag = L.marker(L.latLng(0,0), {
				icon: startIcon,
				interactive: false
				});
           
            return true;
        },

        setBounds: function(bounds) {
			// bounds has south, west, east, north properties
			
			var b = L.latLngBounds(L.latLng(bounds.south, bounds.west), L.latLng(bounds.north, bounds.east));
            map.fitBounds(b);
        },

        addTrack: function(track) {
            if (trackline) {
				map.removeLayer(trackline);
            }
			trackline = L.polyline(
				track,
				{
					color: 'blue',
					opacity: 1,
					interactive: false,
					weight: 4
				}
			).addTo(map);
			
			map.fitBounds(trackline.getBounds());
			
            gliderMarker.setLatLng(track[0]);
            gliderMarker.addTo(map);			
            pin.remove();
        },

        showAirspace: function() {
            var i;
            var j;
            var clipalt = require('./preferences').airclip;
            for (i = 0; i < airspace.polygons.length; i++) {
                if (airspace.polygon_bases[i] < clipalt) {
                    airspace.polygons[i].addTo(map);
                }
                else {
                    airspace.polygons[i].remove();
                }
            }
            for (j = 0; j < airspace.circles.length; j++) {
                if (airspace.circle_bases[j] < clipalt) {
                    airspace.circles[j].addTo(map);
                }
                else {
                    airspace.circles[j].remove();
                }
            }
        },

        setAirspace: function(airdata) {
            var i;
            var j;
            zapAirspace();
            var airDrawOptions = {
                color: 'black',
                opacity: 0.8,
                weight: 1,
                fillColor: '#FF0000',
                fillOpacity: 0.2,
                interactive: false
            };
            for (i = 0; i < airdata.polygons.length; i++) {
				airspace.polygons[i] = L.polygon(
					airdata.polygons[i].coords,
					airDrawOptions
				);
				
//                airspace.polygons[i] = new google.maps.Polygon(airDrawOptions);
//                airspace.polygons[i].setPaths(airdata.polygons[i].coords);
                airspace.polygon_bases[i] = airdata.polygons[i].base;
            }
            for (j = 0; j < airdata.circles.length; j++) {
				airspace.circles[j] = L.circle(
				airdata.circles[j].centre,
				1000 * airdata.circles[j].radius,
				airDrawOptions
				);
				
//                airspace.circles[j] = new google.maps.Circle(airDrawOptions);
//                airspace.circles[j].setRadius(1000 * airdata.circles[j].radius);
//                airspace.circles[j].setCenter(airdata.circles[j].centre);
                airspace.circle_bases[j] = airdata.circles[j].base;
            }
        },

        addSectors: function() {
            var i;
            var circle;
            var line;
            var sector;
            var finish;
            zapSectors();
            var task = require('./task');
            if (task.names.length > 0) {
                var prefs = require('./preferences').sectors;
                line = drawLine(task.coords[0], task.bearing[1], prefs.startrad);
                sectorfeatures.push(line);
                for (i = 1; i < task.names.length - 1; i++) {
                    if (prefs.use_barrel) {
                        circle = sectorCircle(task.coords[i], prefs.tprad);
                        sectorfeatures.push(circle);
                    }
                    if (prefs.use_sector) {
                        sector = drawSector(task.coords[i], task.bearing[i], task.bearing[i + 1], prefs.sector_angle, prefs.sector_rad);
                        sectorfeatures.push(sector);
                    }
                }
                if (prefs.finishtype === 'line') {
                    finish = drawLine(task.coords[task.names.length - 1], task.bearing[task.names.length - 1], prefs.finrad);
                }
                else {
                    finish = sectorCircle(task.coords[task.names.length - 1], prefs.finrad);
                }
                sectorfeatures.push(finish);
                for (i = 0; i < sectorfeatures.length; i++) {
                    sectorfeatures[i].addTo(map);
                }
            }
        },

        zapTask: function() {
            var i;
            zapSectors();
            for (i = 0; i < taskfeatures.length; i++) {
                taskfeatures[i].remove();
            }
            taskfeatures = [];
        },

        showEngineRuns: function(runList) {
            var i;
            var lineOpt = {
                color: 'yellow',
                opacity: 1.0,
                interactive: false,
//                zIndex: google.maps.Marker.MAX_ZINDEX + 1,
                zIndex: 9999,
                weight: 4
            };
            deleteEnl();
            for (i = 0; i < runList.length; i++) {
				engineLines[i] = L.polyline(
					runList[i],
					lineOpt
				).addTo(map);				
            }
        },

        addTask: function(tplist, zoomto) {
            var j;
            this.zapTask();
			
			var route = L.polyline(
				tplist.coords,
				{
					color: 'dimgray',
					opacity: 1,
					weight: 3
				}
			);

            if (zoomto) {
                var taskbounds = getLineBounds(route);
				
                map.fitBounds(taskbounds);
            }
            route.addTo(map);
            taskfeatures.push(route);
            for (j = 0; j < tplist.names.length - 1; j++) {
				//alert('Adding TP marker ' + j + ' for ' + tplist.names[j] + ' at ' + tplist.coords[j].lat + ', ' + tplist.coords[j].lng);
				var taskmarker = L.marker(
					tplist.coords[j],
					{
						title: tplist.names[j],						
						interactive:true,
						zIndex:50
					}
				 );
				 
			taskmarker.bindTooltip(
					  (j + ' - ' + tplist.names[j]),
					  {
						  permanent: false
					  }				 
				 ).openTooltip();
				 
			 taskmarker.addTo(map);

             taskfeatures.push(taskmarker);
            }
            this.addSectors(tplist);
        },

        showTP: function(tpoint) {
            map.panTo(tpoint);
            map.setZoom(13);
        },

        pushPin: function(coords) {
            putMarker(pin, coords);
        },

        resizeMap: function() {
			map.invalidateSize();
 //           google.maps.event.trigger(map, 'resize');
        },

        clearPin: function() {
            pin.remove();
        },
 
        clearMeasureFlags: function() {
            startFlag.remove();
            finishFlag.remove();
        },

        showFinish: function(coords) {
            putMarker(finishFlag, coords);
        },

        showStart: function(coords) {
            putMarker(startFlag, coords);
        },


        activate: function(param) {
            // map.setOptions({
                // draggableCursor: 'pointer'
            // });			
			map.on('click', function(e) {
				param(e.latlng.lat, e.latlng.lng);
				
			});
			savedcursor = $('#map').css( 'cursor');
			
			$('#map').css( 'cursor', 'crosshair' );
			
//            map.addListener('click', function(e) {
//                param(e.latLng.lat(), e.latLng.lng());
//            });
        },

        unclick: function() {
			map.off('click');
			$('#map').css( 'cursor', savedcursor );
            //google.maps.event.clearListeners(map, 'click');
            // map.setOptions({
                // draggableCursor: 'hand'
            // });
        },
 
		// CF181229 - add heading
        setTimeMarker: function(position, heading) {
            gliderMarker.setLatLng(position);
			if (heading) {
				gliderMarker.setRotationAngle(heading);
			}
			var gliderpos = L.latLng(position);
            if (!(map.getBounds().contains(gliderpos))) {
                map.panTo(gliderpos);
            }
        }
    };
})();
