define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dijit/_WidgetBase",
  "dijit/_TemplatedMixin",
  "esri/opsdashboard/MapToolProxy",
  "esri/tasks/BufferParameters",
  "esri/tasks/GeometryService",
  "esri/Color",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/PictureMarkerSymbol",
  "esri/graphic",
  "esri/geometry/geometryEngine",
  "esri/dijit/Search",
  "esri/geometry/webMercatorUtils",
  "dojo/text!./bombthreatMapToolTemplate.html",
  "dijit/form/Select"
], function (declare, lang, _WidgetBase, _TemplatedMixin,
             MapToolProxy, BufferParameters, GeometryService, Color,
             SimpleLineSymbol, SimpleFillSymbol, PictureMarkerSymbol, Graphic, geometryEngine, Search,
             webMercatorUtils, templateString) {
  //var bombt;
  return declare("BombthreatMapTool", [_WidgetBase, _TemplatedMixin, MapToolProxy], {
    templateString: templateString,

    constructor: function () {
      // Create the graphic for the push pin
      var iconPath = location.href.replace(/\/[^/]+$/, '/');
      var symbol = new PictureMarkerSymbol(iconPath + "pushpin.png", 15, 30);
      symbol.yoffset = 10;
      this.pushPinGraphic = new Graphic(null, symbol);

    },
    hostReady: function () {

      // Update the size of the user experience
      alert(this.availableDisplaySize.width);
      this.setDisplaySize({
        width: 750,
        height: 75
      });

      this.theSearch = new Search({
        enableLabel: true,
        enableInfoWindow: false
      }, "");

      // Listen to search search-results events
      this.theSearch.on("search-results", lang.hitch(this, this.theSearchFindResults));

      this.theSearch.startup();

      // Creates two graphics layers to control the order of draw buffers below the pushpin.
      return this.mapWidgetProxy.createGraphicsLayerProxy().then(lang.hitch(this, function (graphicsLayerProxy) {

        this.bufferGraphicsLayerProxy = graphicsLayerProxy;

        return this.mapWidgetProxy.createGraphicsLayerProxy().then(lang.hitch(this, function (graphicsLayerProxy) {
          this.pushPinGraphicsLayerProxy = graphicsLayerProxy;
        }));
      }));
    },

    availableDisplaySizeChanged: function (availableSize) {
      // Update the size of the user experience
      this.setDisplaySize({
        width: 750,
        height: 75
      });
    },

    clickMap: function () {
      // Activate the drawing activity when the graphics layer is ready
      this.activateMapDrawing({geometryType: "point"});

    },
    runBuffer: function () {
      // Starts the buffering process
      this.showBuffers(this.pushPinGraphic.geometry);

    },
    mapDrawComplete: function (geometry) {
      // When the drawing activity has been performed by the user, use the resulting geometry
      // to calculate the buffer rings and display them on the map
      if (!geometry)
        return;

      // Clear the graphics layer.
      this.bufferGraphicsLayerProxy.clear();
      this.pushPinGraphicsLayerProxy.clear();

      // Immediately show a feedback for the user
      this.showPushPin(geometry);
    },

    showPushPin: function (geometry) {
      // Update the position of the push pin graphic
      this.pushPinGraphic.setGeometry(geometry);

      // Update the host graphics layer
      this.pushPinGraphicsLayerProxy.addOrUpdateGraphic(this.pushPinGraphic);

      //Pan map to new geometry
      this.mapWidgetProxy.panTo(geometry);
    },
    showBuffers: function (geometry) {
      var bufValues = this.bombtype.value.split(",");
      var indoorVal = parseInt(bufValues[0]);
      var outdoorVal = parseInt(bufValues[1]);

      // Create the Outdoor symbol
      var outdoorlineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color("#000000"), 2);
      var outdoorSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, outdoorlineSymbol, new Color([255,153,204,0.40]));

      var outdoorBuffer = geometryEngine.buffer(geometry, outdoorVal, "feet", false);
      this.outdoorGraphic = new Graphic(outdoorBuffer, outdoorSymbol);
      this.bufferGraphicsLayerProxy.addOrUpdateGraphic(this.outdoorGraphic);

      //buffer with the geometryEngine
      var indoorBuffer = geometryEngine.geodesicBuffer(geometry, indoorVal,"feet", false );

      // Create the symbol
      var indoorlineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color("#000000"), 2);
      var indoorSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, indoorlineSymbol, new Color([255,0,0]));

      this.indoorGraphic = new Graphic(indoorBuffer, indoorSymbol);
      this.bufferGraphicsLayerProxy.addOrUpdateGraphic(this.indoorGraphic);

      this.mapWidgetProxy.setExtent(outdoorBuffer.getExtent());
    },

    clickSearch: function() {
      if(this.address.value == "Enter address") {
        alert("Please enter a valid address");
        return;
      }
      // Clear the graphics layer.
      this.bufferGraphicsLayerProxy.clear();
      this.pushPinGraphicsLayerProxy.clear();

      this.theSearch.search(this.address.value);
    },

    theSearchFindResults:  function(evt){
      if (evt.numResults == 0){
        alert("No results found, try again...");
        return;
      }
      // Update the position of the push pin graphic
      var geom = webMercatorUtils.geographicToWebMercator(evt.results[0][0].feature.geometry);
      // Immediately show a feedback for the user
      this.showPushPin(geom);
    },

    deactivateMapTool: function () {
      // Deactivate the map tool when the Done button is clicked
      // Clean up then deactivating
      this.deactivateMapDrawing();
      this.mapWidgetProxy.destroyGraphicsLayerProxy(this.bufferGraphicsLayerProxy);
      this.mapWidgetProxy.destroyGraphicsLayerProxy(this.pushPinGraphicsLayerProxy);

      // Call the base function
      this.inherited(arguments, []);
    }
  });
});