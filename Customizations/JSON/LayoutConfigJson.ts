import {LayerConfigJson} from "./LayerConfigJson";
import {TagRenderingConfigJson} from "./TagRenderingConfigJson";
import UnitConfigJson from "./UnitConfigJson";

/**
 * Defines the entire theme.
 *
 * A theme is the collection of the layers that are shown; the intro text, the icon, ...
 * It more or less defines the entire experience.
 *
 * Most of the fields defined here are metadata about the theme, such as its name, description, supported languages, default starting location, ...
 *
 * The main chunk of the json will however be the 'layers'-array, where the details of your layers are.
 *
 * General remark: a type (string | any) indicates either a fixed or a translatable string.
 */
export interface LayoutConfigJson {
   
    /**
     * The id of this layout.
     *
     * This is used as hashtag in the changeset message, which will read something like "Adding data with #mapcomplete for theme #<the theme id>"
     * Make sure it is something decent and descriptive, it should be a simple, lowercase string.
     *
     * On official themes, it'll become the name of the page, e.g.
     * 'cyclestreets' which become 'cyclestreets.html'
     */
    id: string;

    /**
     * Who helped to create this theme and should be attributed?
     */
    credits?: string;

    /**
     * Who does maintian this preset?
     */
    maintainer: string;
    /**
     * Extra piece of text that can be added to the changeset
     */
    changesetmessage?: string;
    /**
     * A version number, either semantically or by date.
     * Should be sortable, where the higher value is the later version
     */
    version: string;
    /**
     * The supported language(s).
     * This should be a two-letter, lowercase code which identifies the language, e.g. "en", "nl", ...
     * If the theme supports multiple languages, use a list: `["en","nl","fr"]` to allow the user to pick any of them
     */
    language: string | string[];

    /**
     * The title, as shown in the welcome message and the more-screen
     */
    title: string | any;

    /**
     * A short description, showed as social description and in the 'more theme'-buttons.
     * Note that if this one is not defined, the first sentence of 'description' is used
     */
    shortDescription?: string | any;

    /**
     * The description, as shown in the welcome message and the more-screen
     */
    description: string | any;

    /**
     * A part of the description, shown under the login-button.
     */
    descriptionTail?: string | any;

    /**
     * The icon representing this theme.
     * Used as logo in the more-screen and (for official themes) as favicon, webmanifest logo, ...
     * Either a URL or a base64 encoded value (which should include 'data:image/svg+xml;base64)
     */
    icon: string;

    /**
     * Link to a 'social image' which is included as og:image-tag on official themes.
     * Useful to share the theme on social media.
     * See https://www.h3xed.com/web-and-internet/how-to-use-og-image-meta-tag-facebook-reddit for more information
     */
    socialImage?: string;

    /**
     * Default location and zoom to start.
     * Note that this is barely used. Once the user has visited mapcomplete at least once, the previous location of the user will be used
     */
    startZoom: number;
    startLat: number;
    startLon: number;

    /**
     * When a query is run, the data within bounds of the visible map is loaded.
     * However, users tend to pan and zoom a lot. It is pretty annoying if every single pan means a reloading of the data.
     * For this, the bounds are widened in order to make a small pan still within bounds of the loaded data.
     *
     * IF widenfactor is 0, this feature is disabled. A recommended value is between 0.5 and 0.01 (the latter for very dense queries)
     */
    widenFactor?: number;

    /**
     * A tagrendering depicts how to show some tags or how to show a question for it.
     *
     * These tagrenderings are applied to _all_ the loaded layers and are a way to reuse tagrenderings.
     * Note that if multiple themes are loaded (e.g. via the personal theme)
     * that these roamingRenderings are applied to the layers of the OTHER themes too!
     *
     * In order to prevent them to do too much damage, all the overpass-tags of the layers are taken and combined as OR.
     * These tag renderings will only show up if the object matches this filter.
     */
    roamingRenderings?: (TagRenderingConfigJson | string)[],

    /**
     * An override applied on all layers of the theme.
     *
     * E.g.: if there are two layers defined:
     * ```
     * "layers":[
     *  {"title": ..., "tagRenderings": [...], "osmSource":{"tags": ...}},
     *  {"title", ..., "tagRenderings", [...], "osmSource":{"tags" ...}}
     * ]
     * ```
     *
     * and overrideAll is specified:
     * ```
     * "overrideAll": {
     *     "osmSource":{"geoJsonSource":"xyz"}
     * }
     * then the result will be that all the layers will have these properties applied and result in:
     * "layers":[
     *  {"title": ..., "tagRenderings": [...], "osmSource":{"tags": ..., "geoJsonSource":"xyz"}},
     *  {"title", ..., "tagRenderings", [...], "osmSource":{"tags" ..., "geoJsonSource":"xyz"}}
     * ]
     * ```
     *
     * If the overrideAll contains a list where the keys starts with a plus, the values will be appended (instead of discarding the old list), for example
     *
     * "overrideAll": {
     *   "+tagRenderings": [ { ... some tagrendering ... }]
     * }
     *
     * In the above scenario, `sometagrendering` will be added at the beginning of the tagrenderings of every layer
     */
    overrideAll?: any;

    /**
     * The id of the default background. BY default: vanilla OSM
     */
    defaultBackgroundId?: string;

    /**
     * The number of seconds that a feature is allowed to stay in the cache.
     * The caching flow is as following:
     *
     * 1. The application is opened the first time
     * 2. An overpass query is run
     * 3. The result is saved to local storage
     *
     * On the next opening:
     *
     * 1. The application is opened
     * 2. Data is loaded from cache and displayed
     * 3. An overpass query is run
     * 4. All data (both from overpass ánd local storage) are saved again to local storage (except when to old)
     *
     * Default value: 60 days
     */
    cacheTimout?: number;


    /**
     * The layers to display.
     *
     * Every layer contains a description of which feature to display - the overpassTags which are queried.
     * Instead of running one query for every layer, the query is fused.
     *
     * Afterwards, every layer is given the list of features.
     * Every layer takes away the features that match with them*, and give the leftovers to the next layers.
     *
     * This implies that the _order_ of the layers is important in the case of features with the same tags;
     * as the later layers might never receive their feature.
     *
     * *layers can also remove 'leftover'-features if the leftovers overlap with a feature in the layer itself
     *
     * Note that builtin layers can be reused. Either put in the name of the layer to reuse, or use {builtin: "layername", override: ...}
     *
     * The 'override'-object will be copied over the original values of the layer, which allows to change certain aspects of the layer
     *
     * For example: If you would like to use layer nature reserves, but only from a specific operator (eg. Natuurpunt) you would use the following in your theme:
     *
     * ```
     * "layer": {
     *  "builtin": "nature_reserve",
     *  "override": {"source": 
     *  {"osmTags": {
     *  "+and":["operator=Natuurpunt"]
     *    }
     *   }
     *  }
     * }
     * ```
     *
     * It's also possible to load multiple layers at once, for example, if you would like for both drinking water and benches to start at the zoomlevel at 12, you would use the following:
     * 
     * ```
     * "layer": {
     *  "builtin": ["benches", "drinking_water"],
     *  "override": {"minzoom": 12}
     * }
     *```
     */
    layers: (LayerConfigJson | string | { builtin: string | string[], override: any })[],

    /**
     * In some cases, a value is represented in a certain unit (such as meters for heigt/distance/..., km/h for speed, ...)
     *
     * Sometimes, multiple denominations are possible (e.g. km/h vs mile/h; megawatt vs kilowatt vs gigawatt for power generators, ...)
     *
     * This brings in some troubles, as there are multiple ways to write it (no denomitation, 'm' vs 'meter' 'metre', ...)
     *
     * Not only do we want to write consistent data to OSM, we also want to present this consistently to the user.
     * This is handled by defining units.
     * 
     * # Rendering
     * 
     * To render a value with long (human) denomination, use {canonical(key)}
     *
     * # Usage
     *
     * First of all, you define which keys have units applied, for example:
     *
     * ```
     * units: [
     *  appliesTo: ["maxspeed", "maxspeed:hgv", "maxspeed:bus"]
     *  applicableUnits: [
     *      ...
     *  ]
     * ]
     * ```
     *
     * ApplicableUnits defines which is the canonical extension, how it is presented to the user, ...:
     *
     * ```
     * applicableUnits: [
     * {
     *     canonicalDenomination: "km/h",
     *     alternativeDenomination: ["km/u", "kmh", "kph"]
     *     default: true,
     *     human: {
     *         en: "kilometer/hour",
     *         nl: "kilometer/uur"
     *     },
     *     humanShort: {
     *         en: "km/h",
     *         nl: "km/u"
     *     }
     * },
     * {
     *     canoncialDenomination: "mph",
     *     ... similar for miles an hour ...
     * }
     * ]
     * ```
     *
     *
     * If this is defined, then every key which the denominations apply to (`maxspeed`, `maxspeed:hgv` and `maxspeed:bus`) will be rewritten at the metatagging stage:
     * every value will be parsed and the canonical extension will be added add presented to the other parts of the code.
     *
     * Also, if a freeform text field is used, an extra dropdown with applicable denominations will be given
     *
     */

    units?: {

        /**
         * Every key from this list will be normalized
         */
        appliesToKey: string[],

        /**
         * The possible denominations
         */
        applicableUnits: UnitConfigJson[]
        /**
         * If set, invalid values will be erased in the MC application (but not in OSM of course!)
         * Be careful with setting this
         */
        eraseInvalidValues?: boolean;
    }[]

    /**
     * If defined, data will be clustered.
     * Defaults to {maxZoom: 16, minNeeded: 500}
     */
    clustering?: {
        /**
         * All zoom levels above 'maxzoom' are not clustered anymore.
         * Defaults to 18
         */
        maxZoom?: number,
        /**
         * The number of elements that should be showed (in total) before clustering starts to happen.
         * If clustering is defined, defaults to 0
         */
        minNeededElements?: number
    },

    /**
     * The URL of a custom CSS stylesheet to modify the layout
     */
    customCss?: string;
    /**
     * If set to true, this layout will not be shown in the overview with more themes
     */
    hideFromOverview?: boolean;

    /**
     * If set to true, the basemap will not scroll outside of the area visible on initial zoom.
     * If set to [[lat0, lon0], [lat1, lon1]], the map will not scroll outside of those bounds.
     * Off by default, which will enable panning to the entire world
     */
    lockLocation?: boolean | [[number, number], [number, number]];

    enableUserBadge?: boolean;
    enableShareScreen?: boolean;
    enableMoreQuests?: boolean;
    enableLayers?: boolean;
    enableSearch?: boolean;
    enableAddNewPoints?: boolean;
    enableGeolocation?: boolean;
    enableBackgroundLayerSelection?: boolean;
    enableShowAllQuestions?: boolean;
    enableDownload?: boolean;  
    enablePdfDownload?: boolean;

}
