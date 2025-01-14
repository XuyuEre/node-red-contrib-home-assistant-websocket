import { createControllerDependencies } from '../../common/controllers/helpers';
import ClientEvents from '../../common/events/ClientEvents';
import Events from '../../common/events/Events';
import State from '../../common/State';
import Status from '../../common/status/Status';
import { RED } from '../../globals';
import { migrate } from '../../helpers/migrate';
import { getServerConfigNode } from '../../helpers/node';
import { getHomeAssistant } from '../../homeAssistant';
import {
    BaseNode,
    BaseNodeProperties,
    OutputProperty,
} from '../../types/nodes';
import WebhookController from './WebhookController';
import WebhookIntegration from './WebhookIntegration';

export interface WebhookNodeProperties extends BaseNodeProperties {
    webhookId: string;
    method_get: boolean;
    method_head: boolean;
    method_put: boolean;
    method_post: boolean;
    local_only: boolean;
    outputProperties: OutputProperty[];
}

export interface WebhookNode extends BaseNode {
    config: WebhookNodeProperties;
}

export default function webhookNode(
    this: WebhookNode,
    config: WebhookNodeProperties
) {
    RED.nodes.createNode(this, config);
    this.config = migrate(config);

    const serverConfigNode = getServerConfigNode(this.config.server);
    const homeAssistant = getHomeAssistant(serverConfigNode);
    const clientEvents = new ClientEvents({
        node: this,
        emitter: homeAssistant.eventBus,
    });
    const nodeEvents = new Events({ node: this, emitter: this });
    const state = new State(this);
    const status = new Status({
        config: serverConfigNode.config,
        nodeEvents,
        node: this,
        state,
    });

    const controllerDeps = createControllerDependencies(this, homeAssistant);
    const integration = new WebhookIntegration({
        node: this,
        clientEvents,
        homeAssistant,
        state,
    });
    integration.setStatus(status);

    this.controller = new WebhookController({
        node: this,
        status,
        ...controllerDeps,
        state,
    });

    integration.init();
}
