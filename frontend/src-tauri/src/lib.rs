mod notifications;
mod fcm;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_os::init())
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
      notifications::check_notification_permission,
      notifications::open_notification_settings,
      notifications::check_app_notification_permission,
      notifications::request_app_notification_permission,
      notifications::open_app_notification_settings,
      notifications::get_pending_notifications,
      notifications::clear_pending_notifications,
      fcm::get_fcm_token,
      fcm::get_pending_navigation,
      fcm::clear_pending_navigation
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
