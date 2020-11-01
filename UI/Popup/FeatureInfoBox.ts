import {UIElement} from "../UIElement";
import {UIEventSource} from "../../Logic/UIEventSource";
import LayerConfig from "../../Customizations/JSON/LayerConfig";
import EditableTagRendering from "./EditableTagRendering";
import QuestionBox from "./QuestionBox";
import Combine from "../Base/Combine";
import TagRenderingAnswer from "./TagRenderingAnswer";

export class FeatureInfoBox extends UIElement {
    private _tags: UIEventSource<any>;
    private _layerConfig: LayerConfig;

    private _title : UIElement;
    private _titleIcons: UIElement;
    private _renderings: UIElement[];
    private _questionBox : UIElement;

    constructor(
        feature: any,
        tags: UIEventSource<any>,
        layerConfig: LayerConfig
    ) {
        super();
        this._tags = tags;
        this._layerConfig = layerConfig;


        this._title = new TagRenderingAnswer(tags, layerConfig.title)
            .SetClass("featureinfobox-title");
        this._titleIcons = new Combine(
            layerConfig.titleIcons.map(icon => new TagRenderingAnswer(tags, icon)))
            .SetClass("featureinfobox-icons");
        this._renderings = layerConfig.tagRenderings.map(tr => new EditableTagRendering(tags, tr));
        this._questionBox = new QuestionBox(tags, layerConfig.tagRenderings);

    }

    InnerRender(): string {
        return new Combine([
            new Combine([this._title, this._titleIcons])
                .SetClass("featureinfobox-titlebar"),
            ...this._renderings,
            this._questionBox
        ]).Render();
    }

}