import TagRenderingConfig from "./TagRenderingConfig";
import SharedTagRenderings from "../../Customizations/SharedTagRenderings";
import {TagRenderingConfigJson} from "./Json/TagRenderingConfigJson";
import {Utils} from "../../Utils";

export default class WithContextLoader {
    protected readonly _context: string;
    private readonly _json: any;
    
    public static getKnownTagRenderings : ((id: string) => TagRenderingConfigJson[])=  function(id)  {
        const found = SharedTagRenderings.SharedTagRenderingJson.get(id)
        if(found !== undefined){
            return [found]
        }else{
            return []
        }
}

    constructor(json: any, context: string) {
        this._json = json;
        this._context = context;
    }

    /** Given a key, gets the corresponding property from the json (or the default if not found
     *
     * The found value is interpreted as a tagrendering and fetched/parsed
     * */
    public tr(key: string, deflt) {
        const v = this._json[key];
        if (v === undefined || v === null) {
            if (deflt === undefined) {
                return undefined;
            }
            return new TagRenderingConfig(
                deflt,
                `${this._context}.${key}.default value`
            );
        }
        if (typeof v === "string") {
            const shared = SharedTagRenderings.SharedTagRendering.get(v);
            if (shared) {
                return shared;
            }
        }
        return new TagRenderingConfig(
            v,
            `${this._context}.${key}`
        );
    }

    /**
     * Converts a list of tagRenderingCOnfigJSON in to TagRenderingConfig
     * A string is interpreted as a name to call
     */
    public ParseTagRenderings(
        tagRenderings: (string | { builtin: string, override: any } | TagRenderingConfigJson)[],
        options?:{
            /**
             * Throw an error if 'question' is defined
             */
            readOnlyMode?: boolean,
            requiresId?: boolean
            prepConfig?: ((config: TagRenderingConfigJson) => TagRenderingConfigJson)
            
        }
    ): TagRenderingConfig[] {
        if (tagRenderings === undefined) {
            return [];
        }

        const context = this._context
        options = options ?? {}
        if (options.prepConfig === undefined) {
            options.prepConfig = c => c
        }
        const preparedConfigs : TagRenderingConfigJson[] = []
        for (let i = 0; i < tagRenderings.length; i++) {
            let renderingJson = tagRenderings[i]
            if(renderingJson === "questions"){
                renderingJson = {
                    id: "questions"
                }
            }
            if (typeof renderingJson === "string") {
                renderingJson = {builtin: renderingJson, override: undefined}
            }

            if (renderingJson["builtin"] === undefined) {
                const patchedConfig = options.prepConfig(<TagRenderingConfigJson>renderingJson)
                preparedConfigs.push(patchedConfig)
                continue
            
            } 
            
            
            const renderingId = renderingJson["builtin"]
            let sharedJsons = []
            if(typeof renderingId === "string"){
                sharedJsons = WithContextLoader.getKnownTagRenderings(renderingId)
            }else{
                sharedJsons = [].concat( ...(<string[]>renderingId).map(id => WithContextLoader.getKnownTagRenderings(id) ) )
            }

            if (sharedJsons.length === 0) {
                const keys = Array.from(SharedTagRenderings.SharedTagRenderingJson.keys());
                throw `Predefined tagRendering ${renderingId} not found in ${context}.\n    Try one of ${keys.join(
                    ", "
                )}\n    If you intent to output this text literally, use {\"render\": <your text>} instead"}`;
            }
            for (let sharedJson of sharedJsons) {
                if (renderingJson["override"] !== undefined) {
                    sharedJson = Utils.Merge(renderingJson["override"], JSON.parse(JSON.stringify(sharedJson)))
                }
    
                const patchedConfig = options.prepConfig(<TagRenderingConfigJson>sharedJson)
                preparedConfigs.push(patchedConfig)
            }

        }

        const renderings: TagRenderingConfig[] = []
        for (let i = 0; i < preparedConfigs.length; i++){
            const preparedConfig = preparedConfigs[i];
            const tr = new TagRenderingConfig(preparedConfig, `${context}.tagrendering[${i}]`);
            if(options.readOnlyMode && tr.question !== undefined){
                throw "A question is defined for "+`${context}.tagrendering[${i}], but this is not allowed at this position - probably because this rendering is an icon, badge or label`
            }
            if(options.requiresId && tr.id === ""){
                throw `${context}.tagrendering[${i}] has an invalid ID - make sure it is defined and not empty`
            }
            
            renderings.push(tr)
        }

        return renderings;
    }
}