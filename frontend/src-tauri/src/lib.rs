mod notifications;
mod fcm;

use std::fs::OpenOptions;
use std::io::Write;
use std::panic;

fn setup_panic_hook() {
  panic::set_hook(Box::new(|panic_info| {
    let msg = if let Some(s) = panic_info.payload().downcast_ref::<&str>() {
      s
    } else if let Some(s) = panic_info.payload().downcast_ref::<String>() {
      s.as_str()
    } else {
      "Unknown panic payload"
    };

    let location = if let Some(location) = panic_info.location() {
      format!("{}:{}:{}", location.file(), location.line(), location.column())
    } else {
      "Unknown location".to_string()
    };

    let panic_log = format!(
      "[{}] [ERROR] [RUST_PANIC] {{\"message\":\"{}\",\"location\":\"{}\"}}\n",
      chrono::Utc::now().to_rfc3339(),
      msg.replace("\"", "\\\""),
      location.replace("\"", "\\\"")
    );

    eprintln!("RUST PANIC: {}", panic_log);

    #[cfg(target_os = "android")]
    {
      if let Some(app_data_dir) = dirs::data_dir() {
        let log_path = app_data_dir.join("logs.txt");
        if let Ok(mut file) = OpenOptions::new()
          .create(true)
          .append(true)
          .open(log_path)
        {
          let _ = file.write_all(panic_log.as_bytes());
        }
      }
    }
  }));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  setup_panic_hook();

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
