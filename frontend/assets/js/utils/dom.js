export function byId(id) {
  return document.getElementById(id);
}

export function setText(element, value) {
  if (!element) {
    return;
  }

  element.textContent = value ?? "";
}

export function setMessage(element, message, state = "info") {
  if (!element) {
    return;
  }

  element.textContent = message ?? "";
  if (message) {
    element.dataset.state = state;
  } else {
    delete element.dataset.state;
  }
}

export function setDisabled(element, isDisabled) {
  if (element) {
    element.disabled = isDisabled;
  }
}
