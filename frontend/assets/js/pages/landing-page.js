import { AppConfig } from "../config.js";
import { UiStrings } from "../constants/strings.js";
import { byId, setMessage, setText } from "../utils/dom.js";
import { SessionController } from "../services/session-controller.js";

const sessionController = new SessionController();

const sessionState = byId("sessionState");
const sessionTarget = byId("sessionTarget");
const sessionAction = byId("sessionAction");
const devUserButton = byId("devUserButton");
const devAdminButton = byId("devAdminButton");
const devSessionMessage = byId("devSessionMessage");

const session = sessionController.getSession();

if (session.token && session.user) {
  setText(sessionState, UiStrings.sessionRestored);
  const destination = session.user.role === AppConfig.roles.admin
    ? UiStrings.landingAdminDestination
    : UiStrings.landingUserDestination;
  setText(sessionTarget, destination);
  sessionAction.textContent = UiStrings.landingOpenDashboard;
  sessionAction.href = session.user.role === AppConfig.roles.admin
    ? AppConfig.pages.adminDashboard
    : AppConfig.pages.userDashboard;
} else {
  setText(sessionState, UiStrings.sessionMissing);
  setText(sessionTarget, UiStrings.landingLoginDestination);
  sessionAction.textContent = UiStrings.landingOpenLogin;
  sessionAction.href = AppConfig.pages.login;
}

if (AppConfig.devSession.enabled) {
  devUserButton.addEventListener("click", () => {
    createDevSession(AppConfig.roles.user, AppConfig.devSession.testUserEmail);
  });

  devAdminButton.addEventListener("click", () => {
    createDevSession(AppConfig.roles.admin, AppConfig.devSession.testAdminEmail);
  });
} else {
  devUserButton.hidden = true;
  devAdminButton.hidden = true;
}

function createDevSession(role, email) {
  sessionController.saveSession({
    token: AppConfig.devSession.placeholderToken,
    user: {
      email,
      role
    }
  });

  setMessage(devSessionMessage, UiStrings.devSessionCreated, "success");
  window.setTimeout(() => {
    sessionController.redirectToRoleHome(role);
  }, 250);
}
