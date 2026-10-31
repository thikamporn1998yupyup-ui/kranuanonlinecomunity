const beforeDirectoryIdentity =
  typeof staffCustomerIdentity === 'function'
    ? staffCustomerIdentity
    : function () {};

staffCustomerIdentity = function () {
  beforeDirectoryIdentity();

  for (const o of liveOrders) {
    if (!o.rider?.profile_available) continue;

    const host = document.querySelector(
      '[data-rider-identity="' + o.id + '"]'
    );

    if (host && !host.querySelector('[data-view-rider]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'c-btn c-secondary';
      button.dataset.viewRider = o.rider.id;
      button.textContent = 'ดูโปรไฟล์';
      button.onclick = () => openRiderDirectory(o.rider.id);
      host.appendChild(button);
    }
  }
};
render();
