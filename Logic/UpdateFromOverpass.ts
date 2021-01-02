import {Or, TagsFilter} from "./Tags";
import {UIEventSource} from "./UIEventSource";
import Bounds from "../Models/Bounds";
import {Overpass} from "./Osm/Overpass";
import Loc from "../Models/Loc";
import LayoutConfig from "../Customizations/JSON/LayoutConfig";
import FeatureSource from "./Actors/FeatureSource";

export default class UpdateFromOverpass implements FeatureSource{

    /**
     * The last loaded features of the geojson
     */
    public readonly features: UIEventSource<any[]> = new UIEventSource<any[]>(undefined);

    /**
     * The time of updating according to Overpass
     */
    public readonly freshness:UIEventSource<Date> = new UIEventSource<Date>(undefined);

    public readonly sufficientlyZoomed: UIEventSource<boolean>;
    public readonly runningQuery: UIEventSource<boolean> = new UIEventSource<boolean>(false);
    public readonly retries: UIEventSource<number> = new UIEventSource<number>(0);
    
    /**
     * The previous bounds for which the query has been run at the given zoom level
     *
     * Note that some layers only activate on a certain zoom level.
     * If the map location changes, we check for each layer if it is loaded:
     * we start checking the bounds at the first zoom level the layer might operate. If in bounds - no reload needed, otherwise we continue walking down
     */
    private readonly _previousBounds: Map<number, Bounds[]> = new Map<number, Bounds[]>();
    private readonly _location: UIEventSource<Loc>;
    private readonly _layoutToUse: UIEventSource<LayoutConfig>;
    private readonly _leafletMap: UIEventSource<L.Map>;

    /**
     * The most important layer should go first, as that one gets first pick for the questions
     */
    constructor(
        location: UIEventSource<Loc>,
        layoutToUse: UIEventSource<LayoutConfig>,
        leafletMap: UIEventSource<L.Map>) {
        this._location = location;
        this._layoutToUse = layoutToUse;
        this._leafletMap = leafletMap;
        const self = this;

        this.sufficientlyZoomed = location.map(location => {
                if(location?.zoom === undefined){
                    return false;
                }
                let minzoom = Math.min(...layoutToUse.data.layers.map(layer => layer.minzoom ?? 18));
                return location.zoom >= minzoom;
            }, [layoutToUse]
        );
        for (let i = 0; i < 25; i++) {
            // This update removes all data on all layers -> erase the map on lower levels too
            this._previousBounds.set(i, []);
        }
       
        layoutToUse.addCallback(() => {
            self.update()
        });
        location.addCallbackAndRun(() => {
            self.update()
        });
    }

    public ForceRefresh() {
        for (let i = 0; i < 25; i++) {
            this._previousBounds.set(i, []);
        }
        this.update();
    }

    private GetFilter() {
        const filters: TagsFilter[] = [];
        for (const layer of this._layoutToUse.data.layers) {
            if(typeof(layer) === "string"){
                continue;
            }
            if (this._location.data.zoom < layer.minzoom) {
                continue;
            }
            if(layer.doNotDownload){
                continue;
            }
                
                
            // Check if data for this layer has already been loaded
            let previouslyLoaded = false;
            for (let z = layer.minzoom; z < 25 && !previouslyLoaded; z++) {
                const previousLoadedBounds = this._previousBounds.get(z);
                if (previousLoadedBounds === undefined) {
                    continue;
                }
                for (const previousLoadedBound of previousLoadedBounds) {
                    previouslyLoaded = previouslyLoaded || this.IsInBounds(previousLoadedBound);
                    if(previouslyLoaded){
                        break;
                    }
                }
            }
            if (previouslyLoaded) {
                continue;
            }
            filters.push(layer.overpassTags);
        }
        if (filters.length === 0) {
            return undefined;
        }
        return new Or(filters);
    }
    private update(): void {
        const filter = this.GetFilter();
        if (filter === undefined) {
            return;
        }

        if (this.runningQuery.data) {
            console.log("Still running a query, skip");
            return;
        }

        const bounds = this._leafletMap.data.getBounds();

        const diff = this._layoutToUse.data.widenFactor;

        const n = Math.min(90, bounds.getNorth() + diff);
        const e = Math.min(180, bounds.getEast() + diff);
        const s = Math.max(-90, bounds.getSouth() - diff);
        const w = Math.max(-180, bounds.getWest() - diff);
        const queryBounds = {north: n, east: e, south: s, west: w};

        const z = Math.floor(this._location.data.zoom);

        this.runningQuery.setData(true);
        const self = this;
        const overpass = new Overpass(filter);
        overpass.queryGeoJson(queryBounds,
            function (data, date) {
                self._previousBounds.get(z).push(queryBounds);
                self.retries.setData(0);
                self.freshness.setData(date);
                self.features.setData(data.features);
                self.runningQuery.setData(false);
            },
            function (reason) {
                self.retries.data++;
                self.ForceRefresh();
                console.log(`QUERY FAILED (retrying in ${5 * self.retries.data} sec)`, undefined);
                self.retries.ping();
                self.runningQuery.setData(false)
                window?.setTimeout(
                    function () {
                        self.update()
                    }, self.retries.data * 5000
                )
            }
        );
        
        
        

    }
    private IsInBounds(bounds: Bounds): boolean {
        if (this._previousBounds === undefined) {
            return false;
        }

        const b = this._leafletMap.data.getBounds();
        return b.getSouth() >= bounds.south &&
            b.getNorth() <= bounds.north &&
            b.getEast() <= bounds.east &&
            b.getWest() >= bounds.west;
    }
    
    
    
    
}