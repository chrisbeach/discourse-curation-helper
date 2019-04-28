import { popupAjaxError } from 'discourse/lib/ajax-error';
import Topic from 'discourse/models/topic';
import { ajax } from 'discourse/lib/ajax';


export default {
    actions: {
        clickRejectButton(topic) {
            return bootbox.confirm(I18n.t('curation.reject_confirm'), I18n.t('no_value'), I18n.t('yes_value'), result => {
                if (result) {
                    this.set("loading", true);
                    ajax("/curation/reject", {
                        type: "PUT",
                        data: {
                            topic_id: topic.id
                        }
                    }).then((result) => {
                        topic.set('custom_fields.rejected_at', result.rejected_at);
                        topic.set('custom_fields.rejected_by', result.rejected_by);
                        topic.set('visible', result.topic.visible);
                    }).catch(e => {
                        popupAjaxError(e)
                    }).finally(() => {
                        this.set("loading", false);
                    });
                }
            });
        },

        clickUndoRejectButton(topic) {
            ajax("/curation/undoreject", {
                type: "PUT",
                data: {
                    topic_id: topic.id
                }
            }).then((result) => {
                topic.set('custom_fields.rejected_at', result.rejected_at);
                topic.set('custom_fields.rejected_by', result.rejected_by);
                topic.set('visible', result.topic.visible);
                topic.set('topic_timer', null);
            }).catch(e => {
                popupAjaxError(e)
            });
        }

    }
};
