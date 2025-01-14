import Joi from 'joi';

import { createControllerDependencies } from '../../common/controllers/helpers';
import Events from '../../common/events/Events';
import InputService, { NodeInputs } from '../../common/services/InputService';
import State from '../../common/State';
import Status from '../../common/status/Status';
import { RED } from '../../globals';
import { migrate } from '../../helpers/migrate';
import { getConfigNodes } from '../../helpers/node';
import { getHomeAssistant } from '../../homeAssistant';
import {
    BaseNode,
    EntityBaseNodeProperties,
    OutputProperty,
} from '../../types/nodes';
import UpdateConfigController from './UpdateConfigController';

export interface UpdateConfigNodeProperties extends EntityBaseNodeProperties {
    outputProperties: OutputProperty[];
}

export interface UpdateConfigNode extends BaseNode {
    config: UpdateConfigNodeProperties;
}

const inputs: NodeInputs = {
    id: {
        messageProp: 'payload.id',
        configProp: 'entityConfig',
    },
    name: {
        messageProp: 'payload.name',
    },
    icon: {
        messageProp: 'payload.icon',
    },
    entityPicture: {
        messageProp: 'payload.entityPicture',
    },
    options: {
        messageProp: 'payload.options',
    },
};

const inputSchema: Joi.ObjectSchema = Joi.object({
    id: Joi.string().required(),
    name: Joi.string().allow(''),
    icon: Joi.string().allow(''),
    entityPicture: Joi.string().allow(''),
    options: Joi.array().items(Joi.string()),
});

export default function UpdateConfig(
    this: UpdateConfigNode,
    config: UpdateConfigNodeProperties
) {
    RED.nodes.createNode(this, config);

    this.config = migrate(config);

    const { entityConfigNode, serverConfigNode } = getConfigNodes(this);
    const homeAssistant = getHomeAssistant(serverConfigNode);
    const nodeEvents = new Events({ node: this, emitter: this });
    const state = new State(this);
    const status = new Status({
        config: serverConfigNode.config,
        nodeEvents,
        node: this,
        state,
    });
    const controllerDeps = createControllerDependencies(this, homeAssistant);
    const inputService = new InputService<UpdateConfigNodeProperties>({
        inputs,
        nodeConfig: this.config,
        schema: inputSchema,
    });

    // eslint-disable-next-line no-new
    new UpdateConfigController({
        homeAssistant,
        inputService,
        integration: entityConfigNode.integration,
        node: this,
        status,
        ...controllerDeps,
    });
}
