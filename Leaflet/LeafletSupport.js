// Contains code to support Leaflet maps....

// Create a Map...

function makeMap(container, accessToken) {

    // Maake a leaflet map in the specified container, with Street  & satellite layers

    if (typeof (L) === 'undefined') return null;
    const LimaLabsKey = "1004KGgIweDGsd4uqlFwerGuDFGIT3HfsadOtwguQKERA01";
	
    var streetLayer = L.tileLayer(`https://cdn.lima-labs.com/{z}/{x}/{y}.png?api=${LimaLabsKey}`, {
        detectRetina: true,
        attribution: 'Map tiles by <a href="http://Lima-Labs.com">Lima Labs</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.'
    });

    var topoLayer = L.tileLayer('https://c.tile.opentopomap.org/{z}/{x}/{y}.png ', {
        detectRetina: true,
        attribution: 'Map: <a href="https://opentopomap.org" target="_blank">OpenTopoMap</a>'
    });

    var satLayer = L.tileLayer('https://wxs.ign.fr/pratique/wmts/?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image%2Fjpeg ', {
        detectRetina: true,
        attribution: 'Map: <a href="http://www.geoportail.gouv.fr/depot/api/cgu/CGU_API_libre.pdf" target="_blank">French Gov</a>'
    });


    var map = L.map(container, {
        center: [54.5, -3],
        zoom: 5
        //layers: [streetsLayer, satLayer]
    });

    var layers = {
        "Street": streetLayer,
        "Topo": topoLayer,
        "Satellite": satLayer
    };
    L.control.layers(layers, null).addTo(map);

    layers.Street.addTo(map);

    return map;
}

// Add the RotatedMarker option...
// https://github.com/bbecquet/Leaflet.RotatedMarker


(function () {
    // save these original methods before they are overwritten
    var proto_initIcon = L.Marker.prototype._initIcon;
    var proto_setPos = L.Marker.prototype._setPos;

    var oldIE = (L.DomUtil.TRANSFORM === 'msTransform');

    L.Marker.addInitHook(function () {
        var iconOptions = this.options.icon && this.options.icon.options;
        var iconAnchor = iconOptions && this.options.icon.options.iconAnchor;
        if (iconAnchor) {
            iconAnchor = (iconAnchor[0] + 'px ' + iconAnchor[1] + 'px');
        }
        this.options.rotationOrigin = this.options.rotationOrigin || iconAnchor || 'center bottom';
        this.options.rotationAngle = this.options.rotationAngle || 0;

        // Ensure marker keeps rotated during dragging
        this.on('drag', function (e) { e.target._applyRotation(); });
    });

    L.Marker.include({
        _initIcon: function () {
            proto_initIcon.call(this);
        },

        _setPos: function (pos) {
            proto_setPos.call(this, pos);
            this._applyRotation();
        },

        _applyRotation: function () {
            if (this.options.rotationAngle) {
                this._icon.style[L.DomUtil.TRANSFORM + 'Origin'] = this.options.rotationOrigin;

                if (oldIE) {
                    // for IE 9, use the 2D rotation
                    this._icon.style[L.DomUtil.TRANSFORM] = 'rotate(' + this.options.rotationAngle + 'deg)';
                } else {
                    // for modern browsers, prefer the 3D accelerated version
                    this._icon.style[L.DomUtil.TRANSFORM] += ' rotateZ(' + this.options.rotationAngle + 'deg)';
                }
            }
        },

        setRotationAngle: function (angle) {
            this.options.rotationAngle = angle;
            this.update();
            return this;
        },

        setRotationOrigin: function (origin) {
            this.options.rotationOrigin = origin;
            this.update();
            return this;
        }
    });
})();