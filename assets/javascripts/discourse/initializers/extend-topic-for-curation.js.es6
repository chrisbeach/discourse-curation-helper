import Topic from 'discourse/models/topic';
import { withPluginApi } from 'discourse/lib/plugin-api';
import computed from 'ember-addons/ember-computed-decorators';

function initializeWithApi(api) {

    const currentUser = api.getCurrentUser();

    Topic.reopen({
        @computed('custom_fields.enable_reject_button')
        canTopicBeRejected: function() {
            const authorPrimaryGroup = this.details && this.details.participants &&
                this.details.participants.length > 0 &&
                this.details.participants[0].primary_group_name;

            const curation_enabled_on_category = (this.category_enable_reject_button) ?
                (this.category_enable_reject_button.toLowerCase() === "true") :
                false;
            return curation_enabled_on_category
                && this.get("category.topic_id") !== this.id
                && this.get("category.topic_id") !== this.id
                && !this.isPrivatemessage
                && currentUser
                && this.siteSettings.curation_helper_enabled
                && this.siteSettings.curation_helper_enabled_on_topics_of_users_with_primary_group === authorPrimaryGroup
        },

        @computed('custom_fields.rejected_at')
        rejected_at: {
            get() {
                return this.get("custom_fields.rejected_at");
            },
            set(value) {
                this.set("custom_fields.rejected_at", value);
                return value;
            }
        }
    });
}

export default {
    name: 'extend-topic-for-curation',
    initialize() {
        withPluginApi('0.1', initializeWithApi);
    }
}
