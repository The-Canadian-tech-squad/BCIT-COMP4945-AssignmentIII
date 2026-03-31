import { AuthApiService } from "../services/auth-api.js";
import { UiStrings } from "../constants/strings.js";
import { byId, setDisabled, setMessage } from "../utils/dom.js";

const authApi = new AuthApiService();
const registerForm = byId("registerForm");
const emailInput = byId("email");
const passwordInput = byId("password");
const roleInput = byId("role");
const formMessage = byId("formMessage");
const emailError = byId("emailError");
const passwordError = byId("passwordError");
const roleError = byId("roleError");

function validateEmail() {
  const email = emailInput.value.trim();
  const isValid = email && email.includes("@");
  if (emailError) {
    emailError.textContent = isValid ? "" : UiStrings.registerEmailError;
  }
  return isValid;
}

function validatePassword() {
  const password = passwordInput.value;
  const isValid = password && password.length >= 8;
  if (passwordError) {
    passwordError.textContent = isValid ? "" : UiStrings.registerPasswordError;
  }
  return isValid;
}

function validateRole() {
  const role = roleInput.value;
  const isValid = role === "user" || role === "admin";
  if (roleError) {
    roleError.textContent = isValid ? "" : UiStrings.registerRoleError;
  }
  return isValid;
}

emailInput.addEventListener("blur", validateEmail);
passwordInput.addEventListener("blur", validatePassword);
roleInput.addEventListener("blur", validateRole);

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setDisabled(registerForm.querySelector("button[type='submit']"), true);
  setMessage(formMessage, "");

  try {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const role = roleInput.value;

    // Mirror backend validation rules for better UX
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();
    const isRoleValid = validateRole();

    if (!isEmailValid || !isPasswordValid || !isRoleValid) {
      // Only show errors next to individual fields; no global error below the button.
      setDisabled(registerForm.querySelector("button[type='submit']"), false);
      return;
    }

    await authApi.register({
      email,
      password,
      role
    });

    registerForm.reset();
    roleInput.value = "user";
    setMessage(formMessage, UiStrings.registerSuccess, "success");
  } catch (error) {
    if (error && error.status === 409) {
      setMessage(formMessage, UiStrings.registerEmailTaken, "error");
    } else {
      setMessage(formMessage, error.message || UiStrings.genericError, "error");
    }
  } finally {
    setDisabled(registerForm.querySelector("button[type='submit']"), false);
  }
});
