import InputOutputController, {
    InputOutputControllerOptions,
    InputProperties,
} from '../../common/controllers/InputOutputController';
import InputError from '../../common/errors/InputError';
import NoConnectionError from '../../common/errors/NoConnectionError';
import { IntegrationEvent } from '../../common/integration/Integration';
import ValueEntityIntegration from '../../common/integration/ValueEntityIntegration';
import { ValueIntegrationMode } from '../../const';
import {
    EntityBaseNodeProperties,
    NodeMessage,
    OutputProperty,
} from '../../types/nodes';
import { EntityConfigNode } from '../entity-config';
import { SelectNode } from '.';

export interface SelectNodeProperties extends EntityBaseNodeProperties {
    mode: ValueIntegrationMode;
    value: string;
    valueType: string;
    outputProperties: OutputProperty[];
}

type SelectNodeOptions = InputOutputControllerOptions<
    SelectNode,
    SelectNodeProperties
>;

export default class TextController extends InputOutputController<
    SelectNode,
    SelectNodeProperties
> {
    protected integration?: ValueEntityIntegration;
    #entityConfigNode?: EntityConfigNode;

    constructor(props: SelectNodeOptions) {
        super(props);
        this.#entityConfigNode = this.integration?.getEntityConfigNode();

        // listen for value changes if we are in listening mode
        if (this.node.config.mode === ValueIntegrationMode.In) {
            this.#entityConfigNode?.addListener(
                IntegrationEvent.ValueChange,
                this.#onValueChange.bind(this)
            );
        }
    }

    protected async onInput({
        done,
        message,
        parsedMessage,
        send,
    }: InputProperties) {
        if (!this.integration?.isConnected) {
            throw new NoConnectionError();
        }
        if (!this.integration?.isIntegrationLoaded) {
            throw new InputError(
                'home-assistant.error.integration_not_loaded',
                'home-assistant.status.error'
            );
        }

        const value = this.typedInputService.getValue(
            parsedMessage.value.value,
            parsedMessage.valueType.value,
            {
                message,
            }
        );

        // get previous value before updating
        const previousValue = this.#entityConfigNode?.state?.getLastPayload()
            ?.state as string | undefined;
        await this.#prepareSend(message, value);
        // send value change to all number nodes
        this.#entityConfigNode?.emit(
            IntegrationEvent.ValueChange,
            value,
            previousValue
        );

        send(message);
        done();
    }

    public async onValueChange(value: string, previousValue?: string) {
        if (typeof value !== 'string') return;

        const message: NodeMessage = {};
        await this.#prepareSend(message, value, previousValue);

        this.node.send(message);
    }

    #isValidValue(option: string): boolean {
        const options = this.integration?.getEntityHomeAssistantConfigValue(
            'options'
        ) as string;

        return options.includes(option);
    }

    async #prepareSend(
        message: NodeMessage,
        value: string,
        previousValue?: string
    ) {
        if (this.#isValidValue(value) === false) {
            throw new InputError(
                'ha-select.error.invalid_value',
                'home-assistant.status.error'
            );
        }

        await this.integration?.updateHomeAssistant(value);
        this.status.setSuccess(value);
        if (!previousValue) {
            previousValue = this.#entityConfigNode?.state?.getLastPayload()
                ?.state as string | undefined;
        }
        this.setCustomOutputs(this.node.config.outputProperties, message, {
            config: this.node.config,
            value,
            previousValue,
        });
        this.#entityConfigNode?.state?.setLastPayload({
            state: value,
            attributes: {},
        });
    }

    async #onValueChange(value: string, previousValue?: string) {
        const message: NodeMessage = {};
        await this.#prepareSend(message, value, previousValue);

        this.node.send(message);
    }
}
