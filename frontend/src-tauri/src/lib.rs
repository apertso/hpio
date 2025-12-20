mod notifications;
mod fcm;

use std::panic;

#[cfg(target_os = "android")]
fn append_to_android_logs(log_line: &str) -> bool {
  use jni::objects::JObject;
  use jni::JavaVM;
  use std::fs::OpenOptions;
  use std::io::Write;
  use std::os::raw::c_void;
  use std::path::PathBuf;

  let ctx = ndk_context::android_context();
  let vm_ptr = ctx.vm() as *mut c_void;
  let Ok(vm) = (unsafe { JavaVM::from_raw(vm_ptr as *mut jni::sys::JavaVM) }) else {
    return false;
  };

  let Ok(mut env) = vm.attach_current_thread() else {
    return false;
  };

  let context_global: JObject<'static> =
    unsafe { JObject::from_raw(ctx.context() as *mut jni::sys::_jobject) };
  let Ok(context) = env.new_local_ref(&context_global) else {
    return false;
  };

  let Ok(files_dir_obj) = env.call_method(&context, "getFilesDir", "()Ljava/io/File;", &[]) else {
    return false;
  };
  let Ok(files_dir_obj) = files_dir_obj.l() else {
    return false;
  };

  let Ok(path_jstring) =
    env.call_method(&files_dir_obj, "getAbsolutePath", "()Ljava/lang/String;", &[])
  else {
    return false;
  };
  let Ok(path_obj) = path_jstring.l() else {
    return false;
  };
  let path_jstring = jni::objects::JString::from(path_obj);
  let Ok(path_str) = env.get_string(&path_jstring) else {
    return false;
  };
  let path_str: String = path_str.into();

  let mut log_path = PathBuf::from(path_str);
  log_path.push("logs.txt");

  if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(log_path) {
    let _ = file.write_all(log_line.as_bytes());
    return true;
  } else {
    eprintln!("Failed to open log file for appending");
  }

  false
}

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
      "[{}] [R] [ERROR] [RUST_PANIC] {{\"message\":\"{}\",\"location\":\"{}\"}}\n",
      chrono::Utc::now().to_rfc3339(),
      msg.replace("\"", "\\\""),
      location.replace("\"", "\\\"")
    );

    eprintln!("RUST PANIC: {}", panic_log);

    #[cfg(target_os = "android")]
    {
      if !append_to_android_logs(&panic_log) {
        use std::fs::OpenOptions;
        use std::io::Write;

        if let Some(app_data_dir) = dirs::data_dir() {
          let log_path = app_data_dir.join("logs.txt");
          if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(log_path) {
            let _ = file.write_all(panic_log.as_bytes());
          }
        }
      }
    }
  }));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  setup_panic_hook();

  let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
    tauri::Builder::default()
      .plugin(tauri_plugin_fs::init())
      .plugin(tauri_plugin_http::init())
      .plugin(tauri_plugin_os::init())
      .plugin(tauri_plugin_dialog::init())
      .plugin(tauri_plugin_clipboard_manager::init())
      .invoke_handler(tauri::generate_handler![
        notifications::check_notification_permission,
        notifications::open_notification_settings,
        notifications::check_app_notification_permission,
        notifications::request_app_notification_permission,
        notifications::open_app_notification_settings,
        notifications::simulate_app_payment_notification,
        notifications::get_pending_notifications,
        notifications::clear_pending_notifications,
        notifications::get_notification_service_status,
        notifications::ping_notification_listener_service,
        notifications::check_battery_optimization_disabled,
        notifications::open_battery_optimization_settings,
        notifications::check_autostart_enabled,
        notifications::open_autostart_settings,
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
  }));

  match result {
    Ok(run_result) => {
      if let Err(e) = run_result {
        let error_log = format!(
          "[{}] [R] [ERROR] [TAURI_RUN_ERROR] {{\"message\":\"{}\"}}\n",
          chrono::Utc::now().to_rfc3339(),
          e.to_string().replace("\"", "\\\"")
        );
        eprintln!("{}", error_log);
        #[cfg(target_os = "android")]
        append_to_android_logs(&error_log);
      }
    }
    Err(_) => {
      eprintln!("Recovered from panic in tauri run");
    }
  }
}
