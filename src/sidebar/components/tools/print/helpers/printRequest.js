import tileMapLayerConfigs from "./wmts_json_config_entries";
import * as helpers from "../../../../../helpers/helpers";

export async function printRequestOptions(mapLayers, description, printSelectedOption) {

    const iconServiceUrl = "https://opengis.simcoe.ca/geoserver/wms?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&WIDTH=20&HEIGHT=20&LAYER=";
    const currentMapViewCenter = window.map.getView().values_.center
    const mapProjection = window.map.getView().getProjection().code_
    const currentMapScale = helpers.getMapScale();
    const mapCenter = [-8875141.45, 5543492.45];
    let geoJsonLayersCount = 0;
    let printAppId = '';

    // init print request object
    let printRequest = {
        layout: "",
        outputFormat: "",
        dpi: 300,
        attributes: {
            title: "",
            description: "",
            map: {},
            overview: {},
            legend: {},
            scaleBar: {},
            scale: ""
        }
    }

    //init list for legend, main and overview map layers to render on template
    let mainMapLayers = [];
    let overviewMap = [];
    let legend = {
        name: "Legend",
        classes: []
    };


    // ..........................................................................
    // RGBA to HEXIDECIMAL Converter
    // ..........................................................................

    //converts rgb to hexadecimal color
    let rgbToHex = function (r, g, b, a) {
        r = r.toString(16);
        g = g.toString(16);
        b = b.toString(16);
        a = (a.toString().split('.')[1]) + "0";

        if (r.length == 1)
            r = "0" + r;
        if (g.length == 1)
            g = "0" + g;
        if (b.length == 1)
            b = "0" + b;
        if (a.length == 1)
            a = "" + a;

        return "#" + r + g + b + a;
    };


    // ..........................................................................
    // Layer Transformer
    // ..........................................................................

    //extract and transform map layers to fit mapfish print request map structure
    let transformMapLayers = (l) => {

        if (l.type === "VECTOR" && l.values_.name === "myMaps") {
            let drawablefeatures = Object.values(l.values_.source.undefIdIndex_);
            for (const key in drawablefeatures) {

                geoJsonLayersCount += 1

                let f = drawablefeatures[key];
                let flat_coords = f.values_.geometry.flatCoordinates
                let grouped_coords = [];

                //transforms flattened coords to geoJson format grouped coords
                for (let i = 0, t = 1; i < flat_coords.length; i += 2, t += 2) {
                    grouped_coords.push([flat_coords[i], flat_coords[t]]);
                }

                mainMapLayers.push({
                    type: "geoJson",
                    geoJson: {
                        type: "FeatureCollection",
                        features: [{
                            type: "Feature",
                            geometry: {
                                type: Object.getPrototypeOf(f.values_.geometry).constructor.name,
                                coordinates: grouped_coords
                            },
                            properties: {
                                id: f.values_.id,
                                label: f.values_.label,
                                labelVisible: f.values_.labelVisible,
                                drawType: f.values_.drawType,
                                isParcel: f.values_.isParcel
                            }
                        }]
                    },
                    name: f.values_.label,
                    style: {
                        version: f.values_.id,
                        "*": {
                            symbolizers: [{
                                type: f.values_.drawType,
                                fillColor: rgbToHex(...f.style_.fill_.color_),
                                strokeColor: rgbToHex(...f.style_.stroke_.color_),
                                fillOpacity: 1,
                                strokeOpacity: 1,
                                strokeWidth: f.style_.stroke_.width_
                            }]
                        }
                    },
                });
            }
        }

        if (l.type === "IMAGE") {

            //image icon layers are spliced/inserted in after geoJson layers. 
            mainMapLayers.splice(geoJsonLayersCount, 0, {
                type: "wms",
                baseURL: "https://opengis.simcoe.ca/geoserver/wms",
                serverType: "geoserver",
                opacity: 1,
                layers: [l.values_.name],
                imageFormat: "image/png",
                customParams: {
                    "TRANSPARENT": "true"
                }
            });
            legend.classes.push({
                icons: [iconServiceUrl + (l.values_.source.params_.LAYERS.replace(/ /g, "%20"))],
                name: l.values_.source.params_.LAYERS.split(":")[1]
            });
        }

        if (l.type === "TILE") {
            //allows for streets to be top most basemap layer
            if (l.values_.service === 'Streets_Cache') {
                mainMapLayers.splice(geoJsonLayersCount, 0, tileMapLayerConfigs[l.values_.service])
                overviewMap.splice(geoJsonLayersCount, 0, tileMapLayerConfigs[l.values_.service])
            } else {
                mainMapLayers.push(tileMapLayerConfigs[l.values_.service])
                overviewMap.push(tileMapLayerConfigs[l.values_.service])
            }
        }
    }
    mapLayers.forEach((l) => transformMapLayers(l));


    // ..........................................................................
    // Print Request Object Builder
    // ..........................................................................

    let buildPrintRequest = (p, options) => {

        //shared print request properties
        p.attributes.map.center = currentMapViewCenter;
        p.attributes.map.projection = mapProjection;
        p.attributes.map.scale = currentMapScale;
        p.attributes.map.longitudeFirst = true;
        p.attributes.map.rotation = 0;
        p.attributes.map.dpi = 300;
        p.attributes.map.layers = mainMapLayers;
        p.outputFormat = options.printFormatSelectedOption.value;

        //switch for specific print request properties based on layout selected
        switch (options.printSizeSelectedOption.value) {
            case '8X11 Portrait':
                printAppId = "letter_portrait";
                p.layout = "letter portrait";
                p.attributes.title = options.mapTitle;
                p.attributes.description = description;
                p.attributes.scaleBar = currentMapScale;
                p.attributes.scale = "1 : " + currentMapScale.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                break;
            case '11X8 Landscape':
                printAppId = "letter_landscape";
                p.layout = "letter landscape";
                p.attributes.title = options.mapTitle;
                p.attributes.description = description;
                p.attributes.scaleBar = currentMapScale;
                p.attributes.scale = "1 : " + currentMapScale.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                break;
            case '8X11 Portrait Overview':
                printAppId = "letter_portrait_overview";
                p.layout = "letter portrait overview";
                p.attributes.title = options.mapTitle;
                p.attributes.description = description;
                p.attributes.scaleBar = currentMapScale;
                p.attributes.scale = "1 : " + currentMapScale.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                p.attributes.legend = legend;
                p.attributes.overview.center = mapCenter;
                p.attributes.overview.projection = mapProjection;
                p.attributes.overview.scale = options.forceScale;
                p.attributes.overview.longitudeFirst = true;
                p.attributes.overview.rotation = 0;
                p.attributes.overview.dpi = 300;
                p.attributes.overview.layers = overviewMap;
                break;
            case 'Map Only':
                printAppId = "map_only";
                p.layout = "map only";
                break;
            case 'Map Only Portrait':
                printAppId = "map_only_portrait";
                p.layout = "map only portrait";
                break;
            case 'Map Only Landscape':
                printAppId = "map_only_landscape";
                p.layout = "map only landscape";
                break;
            default:
                printAppId = "letter_portrait";
                p.layout = "letter portrait";
                break;
        }

    }
    buildPrintRequest(printRequest, printSelectedOption)



    // ..........................................................................
    // Post and await print result via request object
    // ..........................................................................

    console.log(mapLayers);

    console.log(printRequest);

    let origin = window.location.origin;
    let testOrigin = 'http://localhost:8080'
    let interval = 5000;

    //check print Status
    let checkStatus = (response)=>{
        
        fetch(`${testOrigin}${response.statusURL}`)
        .then(data => data.json())
        .then((data)=>{
            setTimeout(() => {
                if (data.done===true) {
                    interval=0
                    window.open(`${testOrigin}${data.downloadURL}`)
                }else{
                    if (interval===25000) {
                        interval=5000
                    }else{
                        interval+=5000
                        checkStatus(response)
                    }
                }
            }, interval);
        })
        console.log('interval: '+interval);
    }

    let  data = encodeURIComponent(JSON.stringify(printRequest))
    let url =`${testOrigin}/print/print/${printAppId}/report.${(printSelectedOption.printFormatSelectedOption.value).toLowerCase()}`;

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'  
        },
        body: data
    })
    .then(response => response.json())
    .then((response) => {
        checkStatus(response)
    })
    .catch(error => console.error('Error:', error))

    

    

    

    


}