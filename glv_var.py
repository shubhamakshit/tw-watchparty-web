# defining some variables that can be used in the preferences file
import os

from Debugger import Debugger
import os

class BasicUtils:

    @staticmethod
    def delete_old_files(directory, minutes):
        """
        Delete files in the given directory which are older than the given number of minutes.
        """
        import time

        current_time = time.time()

        for file in os.listdir(directory):
            file_path = os.path.join(directory, file)

            if os.path.isfile(file_path):
                file_time = os.path.getmtime(file_path)

                if current_time - file_time >= minutes * 60:
                    os.remove(file_path)

    @staticmethod
    def abspath(path):
        return str(os.path.abspath(os.path.expandvars(path))).replace("\\", "/")

vars = {

    # $script is the path to the folder containing the pwdl.py file
    # Since the userPrefs.py is in the startup folder,
    # we need to go one level up however we make the exception that if the pwdl.py is in the same folder as
    # the startup folder, we don't need to go one level up
    "$script": BasicUtils.abspath(os.path.dirname(__file__) + (
        '/../..' if not os.path.exists(os.path.dirname(__file__) + '../pwdl.py') else '')),
    "$home": os.path.expanduser("~") if os.name == 'posix' else os.getenv('USERPROFILE'),
}

debugger = Debugger(enabled=True,show_location=True)

env_file = os.getenv('PWDL_PREF_FILE')
sys_verbose = os.getenv('PWDL_VERBOSE')
if env_file and os.path.exists(env_file):
    if sys_verbose: print(f"Using preferences file: {env_file}")
    PREFS_FILE = env_file
else:
    if sys_verbose: print(f"Using default preferences file: {os.path.join(vars['$script'], 'preferences.json')}")
    PREFS_FILE = os.path.join(vars["$script"], 'preferences.json')

api_webdl_directory = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../webdl'))
EXECUTABLES = ['ffmpeg', 'mp4decrypt']


MINIMUM_PORT = 1024

class ENDPOINTS_NAME:

    base = 'api'

    @staticmethod
    def GET_PVT_FILE_FOR_A_CLIENT(client_id="<client_id>",name="<name>"):
        return f"/{ENDPOINTS_NAME.base}/get-private-file/{client_id}/{name}"

