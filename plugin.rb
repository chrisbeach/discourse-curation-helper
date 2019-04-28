# name: discourse-curation-helper
# about: Adds buttons to designated category to help forum members curate topics created by bots
# version: 0.0.1
# authors: Chris Beach

enabled_site_setting :curation_helper_enabled

PLUGIN_NAME ||= "discourse-curation-helper".freeze

after_initialize do

  if SiteSetting.curation_helper_enabled then

    add_to_serializer(:topic_view, :category_enable_reject_button, false) {
      object.topic.category.custom_fields['enable_reject_button'] if object.topic.category
    }

    add_to_serializer(:topic_view, :custom_fields, false) {
      object.topic.custom_fields
    }

  end

  module ::DiscourseCurationHelper
    class Engine < ::Rails::Engine
      engine_name PLUGIN_NAME
      isolate_namespace DiscourseCurationHelper
    end
  end

  class DiscourseCurationHelper::Curation
    class << self

      def reject(topic_id, user)
        DistributedMutex.synchronize("#{PLUGIN_NAME}-#{topic_id}") do
          topic = Topic.find_by_id(topic_id)

          if topic.category.nil? || topic.category.custom_fields['enable_reject_button'] != "true"
            raise StandardError.new I18n.t("curation.cant_reject_in_this_category")
          end

          # topic must not be deleted
          if topic.nil? || topic.trashed?
            raise StandardError.new I18n.t("curation.topic_is_deleted")
          end

          topic.custom_fields["rejected_at"] = Time.zone.now.iso8601
          topic.custom_fields["rejected_by"] = user.id

          options = {
              by_user: user
          }

          topic.set_or_create_timer(
              TopicTimer.types[:delete],
              '1', # hour
              options
          )
          topic.visible = false

          if topic.save
            return topic
          else
            raise StandardError.new I18n.t("curation.topic_rejection_failed")
          end
        end
      end

      def undo_reject(topic_id)
        DistributedMutex.synchronize("#{PLUGIN_NAME}-#{topic_id}") do
          topic = Topic.find_by_id(topic_id)
          # topic must not be deleted
          if topic.nil? || topic.trashed?
            raise StandardError.new I18n.t("curation.topic_is_deleted")
          end

          topic.custom_fields["rejected_at"] = nil
          topic.custom_fields["rejected_by"] = nil
          topic.visible = true
          topic.delete_topic_timer(TopicTimer.types[:delete])

          if topic.save
            return topic
          else
            raise StandardError.new I18n.t("curation.topic_rejection_failed")
          end
        end
      end

    end
  end

  require_dependency "application_controller"

  class DiscourseCurationHelper::CurationController < ::ApplicationController
    requires_plugin PLUGIN_NAME

    before_action :ensure_logged_in

    def reject
      topic_id = params.require(:topic_id)

      begin
        topic = DiscourseCurationHelper::Curation.reject(topic_id, current_user)
        render json: {
            topic: topic,
            rejected_at: topic.custom_fields["rejected_at"],
            rejected_by: topic.custom_fields["rejected_by"]
        }
      rescue StandardError => e
        render_json_error e.message
      end
    end

    def undo_reject
      topic_id = params.require(:topic_id)

      begin
        topic = DiscourseCurationHelper::Curation.undo_reject(topic_id)
        render json: {
            topic: topic,
            rejected_at: topic.custom_fields["rejected_at"],
            rejected_by: topic.custom_fields["rejected_by"]
        }
      rescue StandardError => e
        render_json_error e.message
      end
    end
  end

  DiscourseCurationHelper::Engine.routes.draw do
    put "/reject" => "curation#reject"
    put "/undoreject" => "curation#undo_reject"
  end

  Discourse::Application.routes.append do
    mount ::DiscourseCurationHelper::Engine, at: "/curation"
  end

end
