import Topic from 'discourse/models/topic';
import { withPluginApi } from 'discourse/lib/plugin-api';
import computed from 'ember-addons/ember-computed-decorators';

function initializeWithApi(api) {

    const currentUser = api.getCurrentUser();

    Topic.reopen({

        @computed('siteSettings.curation_helper_enabled_on_topics_of_users_with_primary_group')
        curationEnabledOnTopic: function() {
            if (!this.category_enable_reject_button ||
                this.category_enable_reject_button.toLowerCase() !== "true") {
                return false;
            } else {
                const authorPrimaryGroup = this.details && this.details.participants &&
                    this.details.participants.length > 0 &&
                    this.details.participants[0].primary_group_name;

                return this.siteSettings.curation_helper_enabled_on_topics_of_users_with_primary_group === authorPrimaryGroup;
            }
        },

        @computed('siteSettings.curation_helper_min_user_trust', 'siteSettings.curation_helper_enabled_on_topics_of_users_with_primary_group')
        topicCannotBeRejectedReason: function() {
            if (!currentUser) {
                return I18n.t("curation.anon_cant_curate")
            } else if (this.isPrivatemessage) {
                return I18n.t("curation.cant_curate_pm");
            } else if (currentUser.trust_level < this.siteSettings.curation_helper_min_user_trust) {
                return I18n.t("curation.higher_trust_level_required",
                    {min: this.siteSettings.curation_helper_min_user_trust,
                        actual: currentUser.trust_level});
            } else {
                return null;
            }
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
