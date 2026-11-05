/* Contact page forms. They check what's filled in, then send to the form service named in site.config.json
   (contact.formEndpoint). While no service is set (data-ready="no"), nothing is sent and the form says so plainly. */
(function () {
  'use strict';
  var forms = document.querySelectorAll('form[data-form]');
  Array.prototype.forEach.call(forms, function (form) {
    var status = form.querySelector('.form-status');
    function say(text, ok) {
      status.textContent = text;
      status.style.color = ok ? 'var(--sprout)' : 'var(--ember)';
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.willValidate) return;
        var bad = !el.checkValidity();
        el.setAttribute('aria-invalid', bad ? 'true' : 'false');
        if (bad && !firstBad) firstBad = el;
      });
      if (firstBad) {
        var label = form.querySelector('label[for="' + firstBad.id + '"]');
        say('Please check "' + (label ? label.firstChild.textContent.trim() : firstBad.name) + '" and try again.', false);
        firstBad.focus();
        return;
      }
      if (form.dataset.ready !== 'yes') {
        say('This form isn\'t connected yet, so nothing was sent. It goes live when the shop opens.', false);
        return;
      }
      var button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      say('Sending…', true);
      fetch(form.dataset.endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          form.reset();
          say(form.dataset.form === 'church'
            ? 'Request sent. Ken or Ann will call the number you gave to confirm it.'
            : 'Message sent. Thank you!', true);
        })
        .catch(function () { say('It didn\'t send. Please check your connection and try again.', false); })
        .then(function () { button.disabled = false; });
    });
  });
}());
