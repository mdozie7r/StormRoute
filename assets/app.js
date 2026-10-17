/* StormRoute — navigation with a live weather overlay.
   Maps: CARTO basemaps (OpenStreetMap data). Search: Photon. Routing: OSRM.
   Weather: Iowa Environmental Mesonet NEXRAD radar, Open-Meteo forecasts, NWS alerts. */
(function () {
  'use strict';

  var NATIVE = window.Android || null; // provided by the Android wrapper
  var $ = function (id) { return document.getElementById(id); };

  // ---------- storage (best-effort) ----------
  function load(k, d) { try { var v = localStorage.getItem('sr.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem('sr.' + k, JSON.stringify(v)); } catch (e) {} }

  var prefs = load('prefs', { radar: true, routewx: true, alerts: true, voice: true, theme: 'auto', satellite: false, traffic: false, speedo: true, routeMode: 'fast' });
  // TomTom key (personal) — powers the live traffic flow + incidents layer.
  var TOMTOM_KEY = 'ZwZfpWktE49WPHQlkXvgxA3OKaOP9wje';
  // BRouter (free, keyless) powers Curvy routing — a car-vario profile tuned to avoid
  // motorways, bypass towns and favour smaller, twistier roads. Uploaded once; id cached.
  var BROUTER = 'https://brouter.de/brouter';
  var CURVY_PROFILE_B64 = 'IwojIENhci1Sb3V0aW5nIGJhc2VkIG9uIGEga2luZW1hdGljIG1vZGVsCiMKIyBEZXBlbmRpbmcgb24gdGhlIHZtYXgtcGFyYW1ldGVyICh0YXJnZXQtc3BlZWQpCiMgYW5kIGNhbiBoYW5kbGUgdGhlIGNvc3RmYWN0b3IKIyB0aGlzIGNhbiBiZSBhbnl0aGluZyBmcm9tIGxlYXN0LXRpbWUgcm91dGluZyB0byBlY28tcm91dGluZwojCiMKLS0tbW9kZWw6YnRvb2xzLnJvdXRlci5LaW5lbWF0aWNNb2RlbAoKLS0tY29udGV4dDpnbG9iYWwKCiMgQ2FyIHByb2ZpbGUKYXNzaWduIHZhbGlkRm9yQ2FycyAgICAgICAgPSB0cnVlCgojIFVzZSB0aGUgZm9sbG93aW5nIHN3aXRjaGVzIHRvIGNoYW5nZSBiZWhhdmlvdXIKYXNzaWduIGF2b2lkX3RvbGwgICAgICAgICAgPSBmYWxzZSAgIyAlYXZvaWRfdG9sbCUgfCBBdm9pZCBwYWlkIHJvYWRzIHwgYm9vbGVhbgphc3NpZ24gYXZvaWRfdW5wYXZlZCAgICAgICA9IHRydWUgICMgJWF2b2lkX3VucGF2ZWQlIHwgQXZvaWQgdW5wYXZlZCByb2FkcywgaWYgcG9zc2libGUgfCBib29sZWFuCmFzc2lnbiBhdm9pZF9tb3RvcndheXMgICAgID0gdHJ1ZSAgIyAlYXZvaWRfbW90b3J3YXlzJSB8IEF2b2lkIG1vdG9yd2F5cyB8IGJvb2xlYW4KCmFzc2lnbiBhZGRfYmVlbGluZSAgICAgICAgID0gZmFsc2UgICMgJWFkZF9iZWVsaW5lJSB8IEVuYWJsZSBiZWVsaW5lIG9uIGRpc3RhbnQgc3RhcnQvZW5kIHBvaW50cyB8IGJvb2xlYW4KYXNzaWduIHVzZV9vZmZyb2FkICAgICAgICAgPSBmYWxzZSAgIyAldXNlX29mZnJvYWQlIHwgRW5hYmxlIGFkZGl0aW9uYWwgcm9hZHMgfCBib29sZWFuCgphc3NpZ24gY29uc2lkZXJfcml2ZXIgICAgICA9IGZhbHNlICAjICVjb25zaWRlcl9yaXZlciUgfCBBY3RpdmF0ZSB0byBwcmVmZXIgYSByb3V0ZSBhbG9uZyByaXZlcnMsIGxha2VzLCBldGMuIHwgYm9vbGVhbgphc3NpZ24gY29uc2lkZXJfZm9yZXN0ICAgICA9IGZhbHNlICAjICVjb25zaWRlcl9mb3Jlc3QlIHwgQWN0aXZhdGUgdG8gcHJlZmVyIGEgcm91dGUgaW4gZm9yZXN0IG9yIHBhcmtzIHwgYm9vbGVhbgphc3NpZ24gY29uc2lkZXJfdG93biAgICAgICA9IHRydWUgICMgJWNvbnNpZGVyX3Rvd24lIHwgQWN0aXZhdGUgdG8gYnlwYXNzIGNpdGllcyAvIGJpZyB0b3ducyBhcyBmYXIgYXMgcG9zc2libGUgfCBib29sZWFuCgojIEtpbmVtYXRpYyBtb2RlbCBwYXJhbWV0ZXJzCmFzc2lnbiB2bWF4ICAgICAgICAgICAgID0gNTUgICAgICMgJXZtYXglIHwgVGFyZ2V0IHNwZWVkIChpbiBrbS9oKSB8IG51bWJlcgphc3NpZ24gcmVjdXBfZWZmaWNpZW5jeSA9IDAuNyAgICAjICVyZWN1cF9lZmZpY2llbmN5JSB8IChyYXRpbykgfCBudW1iZXIKYXNzaWduIHRvdGFsd2VpZ2h0ICAgICAgPSAxNjQwICAgIyAldG90YWx3ZWlnaHQlIHwgVG90YWwgd2VpZ2h0IG9mIHRoZSBjYXIgKGluIGtnKSB8IG51bWJlcgphc3NpZ24gZl9yb2xsICAgICAgICAgICA9IDIzMiAgICAjICVmX3JvbGwlIHwgUm9sbGluZyBmcmljdGlvbiAoaW4gTmV3dG9uKSB8IG51bWJlcgphc3NpZ24gZl9haXIgICAgICAgICAgICA9IDAuNCAgICAjICVmX2FpciUgfCBEcmFnIGZvcmNlIChpbiBOZXd0b24gLyAobS9zKV4yKSwgMC41KmN3KkEqcmhvIHwgbnVtYmVyCmFzc2lnbiBmX3JlY3VwICAgICAgICAgID0gNDAwICAgICMgJWZfcmVjdXAlIHwgTmV3dG9uIHwgbnVtYmVyCmFzc2lnbiBwX3N0YW5kYnkgICAgICAgID0gMjUwICAgICMgJXBfc3RhbmRieSUgfCBXYXR0IHwgbnVtYmVyCgojIFR1cm4gaW5zdHJ1Y3Rpb25zIHNldHRpbmdzCmFzc2lnbiB0dXJuSW5zdHJ1Y3Rpb25Nb2RlICAgICAgICAgID0gMSAgICAgIyAldHVybkluc3RydWN0aW9uTW9kZSUgfCBNb2RlIGZvciB0aGUgZ2VuZXJhdGVkIHR1cm4gaW5zdHJ1Y3Rpb25zIHwgWzA9bm9uZSwgMT1hdXRvLWNob29zZSwgMj1sb2N1cy1zdHlsZSwgMz1vc21hbmQtc3R5bGUsIDQ9Y29tbWVudC1zdHlsZSwgNT1ncHNpZXMtc3R5bGUsIDY9b3J1eC1zdHlsZSwgNz1sb2N1cy1vbGQtc3R5bGVdCgojIFRlY2huaWNhbCBwYXJhbWV0ZXJzCmFzc2lnbiBwYXNzMWNvZWZmaWNpZW50ICAgID0gMS4zCgoKLS0tY29udGV4dDp3YXkgICAjIGZvbGxvd2luZyBjb2RlIHJlZmVycyB0byB3YXktdGFncwoKIyBjbGFzc2lmaWVyIGNvbnN0YW50cwphc3NpZ24gY2xhc3NpZmllcl9ub25lICAgICAgICA9IDEKYXNzaWduIGNsYXNzaWZpZXJfZmVycnkgICAgICAgPSAyCgphc3NpZ24gaXNfYXZvaWRlZF90b2xsX3JvYWQgYW5kICBhdm9pZF90b2xsIHRvbGw9eWVzCmFzc2lnbiBpc19hdm9pZGVkX21vdG9yd2F5IGFuZCBhdm9pZF9tb3RvcndheXMgaGlnaHdheT1tb3RvcndheXxtb3RvcndheV9saW5rCgoKIwojIGNhbGN1bGF0ZSBsb2dpY2FsIGNhciBhY2Nlc3MKIwphc3NpZ24gaXNyZXNpZGVudGlhbG9ybGl2aW5nID0gb3IgaGlnaHdheT1yZXNpZGVudGlhbHxsaXZpbmdfc3RyZWV0IGxpdmluZ19zdHJlZXQ9eWVzCgphc3NpZ24gY2FyYWNjZXNzCiAgICAgICBzd2l0Y2ggbW90b3JjYXI9CiAgICAgICAgICAgICAgc3dpdGNoIG1vdG9yX3ZlaGljbGU9CiAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCB2ZWhpY2xlPQogICAgICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIGFjY2Vzcz0KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggaGlnaHdheT1tb3RvcndheXxtb3RvcndheV9saW5rICAgICAgIDEKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggaGlnaHdheT10cnVua3x0cnVua19saW5rICAgICAgICAgICAgIDEKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggaGlnaHdheT1wcmltYXJ5fHByaW1hcnlfbGluayAgICAgICAgIDEKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggaGlnaHdheT1zZWNvbmRhcnl8c2Vjb25kYXJ5X2xpbmsgICAgIDEKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggaGlnaHdheT10ZXJ0aWFyeXx0ZXJ0aWFyeV9saW5rICAgICAgIDEKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggaGlnaHdheT11bmNsYXNzaWZpZWQgICAgICAgICAgICAgICAgIDEKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggYW5kIGhpZ2h3YXk9dHJhY2sgdXNlX29mZnJvYWQgICAgICAgIDEKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggYW5kIGhpZ2h3YXk9cm9hZCB1c2Vfb2Zmcm9hZCAgICAgICAgIDEKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggcm91dGU9ZmVycnkgICAgICAgICAgICAgICAgICAgICAgICAgIDEKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggaXNyZXNpZGVudGlhbG9ybGl2aW5nICAgICAgICAgICAgICAgIDEKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggaGlnaHdheT1zZXJ2aWNlICAgICAgICAgICAgICAgICAgICAgIDEKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAwCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXNzPXllc3xwZXJtaXNzaXZlfGRlc2lnbmF0ZWR8ZGVzdGluYXRpb24KICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlaGljbGU9eWVzfGRlc2lnbmF0ZWR8ZGVzdGluYXRpb24KICAgICAgICAgICAgICAgICAgICAgbW90b3JfdmVoaWNsZT15ZXN8cGVybWlzc2l2ZXxkZXNpZ25hdGVkfGRlc3RpbmF0aW9uCiAgICAgICAgICAgICAgbW90b3JjYXI9eWVzfHBlcm1pc3NpdmV8ZGVzaWduYXRlZHxkZXN0aW5hdGlvbgoKYXNzaWduIGNhcmFjY2Vzc19kZXN0aW5hdGlvbgogICAgICAgc3dpdGNoIG1vdG9yY2FyPQogICAgICAgICAgICAgIHN3aXRjaCBtb3Rvcl92ZWhpY2xlPQogICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggdmVoaWNsZT0KICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjY2Vzcz1kZXN0aW5hdGlvbgogICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVoaWNsZT1kZXN0aW5hdGlvbgogICAgICAgICAgICAgICAgICAgICBtb3Rvcl92ZWhpY2xlPWRlc3RpbmF0aW9uCiAgICAgICAgICAgICAgbW90b3JjYXI9ZGVzdGluYXRpb24KCiMKIyBmb3IgYW55IGNoYW5nZSBpbiBpbml0aWFsY2xhc3NpZmllciwgaW5pdGlhbGNvc3QgaXMgYWRkZWQgb25jZQojCmFzc2lnbiBpbml0aWFsY2xhc3NpZmllciA9CiAgICAgaWYgcm91dGU9ZmVycnkgdGhlbiBjbGFzc2lmaWVyX2ZlcnJ5CiAgICAgZWxzZSBjbGFzc2lmaWVyX25vbmUKCgojCiMgY2FsY3VsYXRlIHRoZSBpbml0aWFsIGNvc3QKIyB0aGlzIGlzIGFkZGVkIHRvIHRoZSB0b3RhbCBjb3N0IGVhY2ggdGltZSB0aGUgY29zdGZhY3RvcgojIGNoYW5nZWQKIwphc3NpZ24gaW5pdGlhbGNvc3QgPQogICAgIGlmICAgICAgKCBhbmQgaGlnaHdheT0gbm90IHJvdXRlPWZlcnJ5ICkgdGhlbiAxMDAwMAogICAgIGVsc2UgaWYgKCBlcXVhbCBpbml0aWFsY2xhc3NpZmllciBjbGFzc2lmaWVyX2ZlcnJ5ICkgdGhlbiAxMDAwMAogICAgIGVsc2UgMAoKYXNzaWduIGFjY2Vzc3NwZWVkbGltaXQgPSBpZiBjYXJhY2Nlc3MgdGhlbiA5OTkgZWxzZSAwCgphc3NpZ24gaXNiYWRvbmV3YXkgPSBpZiByZXZlcnNlZGlyZWN0aW9uPXllcyB0aGVuICggaWYgb25ld2F5PSB0aGVuIGp1bmN0aW9uPXJvdW5kYWJvdXQgZWxzZSBvbmV3YXk9eWVzfHRydWV8MSApIGVsc2Ugb25ld2F5PS0xCmFzc2lnbiBvbmV3YXlzcGVlZGxpbWl0ID0gaWYgaXNiYWRvbmV3YXkgdGhlbiAwIGVsc2UgOTk5Cgphc3NpZ24gaXNsaW5rdHlwZSA9IGhpZ2h3YXk9bW90b3J3YXlfbGlua3x0cnVua19saW5rfHByaW1hcnlfbGlua3xzZWNvbmRhcnlfbGlua3x0ZXJ0aWFyeV9saW5rCgphc3NpZ24gbWF4c3BlZWRfc3VyZmFjZSA9CiAgc3dpdGNoIG9yIHN1cmZhY2U9IHN1cmZhY2U9cGF2ZWR8YXNwaGFsdHxjb25jcmV0ZSA5OTkKICBzd2l0Y2ggc3VyZmFjZT1wYXZpbmdfc3RvbmVzfGNvYmJsZXN0b25lfHNldHQgMzAKICBzd2l0Y2ggc3VyZmFjZT1maW5lX2dyYXZlbCAoIHN3aXRjaCBhdm9pZF91bnBhdmVkIDMgMTAgKQogIHN3aXRjaCBhdm9pZF91bnBhdmVkIDEgMgoKYXNzaWduIG1heHNwZWVkX3RyYWNrdHlwZSA9CiAgc3dpdGNoIHRyYWNrdHlwZT0gOTk5CiAgc3dpdGNoIHRyYWNrdHlwZT1ncmFkZTEgNDAKICBzd2l0Y2ggdHJhY2t0eXBlPWdyYWRlMiAoIHN3aXRjaCBhdm9pZF91bnBhdmVkIDIgNSApCiAgMQoKYXNzaWduIG1heHNwZWVkX2ltcGxpY2l0ID0KICBzd2l0Y2ggaGlnaHdheT1tb3RvcndheSAgICAgICAgICAgICAgICAgIDk5OQogIHN3aXRjaCBoaWdod2F5PW1vdG9yd2F5X2xpbmsgICAgICAgICAgICAgMTMwCiAgc3dpdGNoIGhpZ2h3YXk9dHJ1bmsgICAgICAgICAgICAgICAgICAgICAyNTAKICBzd2l0Y2ggaGlnaHdheT10cnVua19saW5rICAgICAgICAgICAgICAgIDEwMAogIHN3aXRjaCBoaWdod2F5PXByaW1hcnl8cHJpbWFyeV9saW5rICAgICAgMTAwCiAgc3dpdGNoIGhpZ2h3YXk9c2Vjb25kYXJ5fHNlY29uZGFyeV9saW5rICAgOTAKICBzd2l0Y2ggaGlnaHdheT10ZXJ0aWFyeXx0ZXJ0aWFyeV9saW5rICAgICA4MAogIHN3aXRjaCBoaWdod2F5PXVuY2xhc3NpZmllZCAgICAgICAgICAgICAgIDUwCiAgc3dpdGNoIHJvdXRlPWZlcnJ5ICAgICAgICAgICAgICAgICAgICAgICAgMTAKICBzd2l0Y2ggaGlnaHdheT1icmlkbGV3YXkgICAgICAgICAgICAgICAgICAxMAogIHN3aXRjaCBpc3Jlc2lkZW50aWFsb3JsaXZpbmcgICAgICAgICAgICAgIDMwCiAgc3dpdGNoIGhpZ2h3YXk9c2VydmljZSAgICAgICAgICAgICAgICAgICAgMzAKICBzd2l0Y2ggaGlnaHdheT10cmFja3xyb2FkfHBhdGggc3dpdGNoIHRyYWNrdHlwZT1ncmFkZTEgMzAgNQogIDAKCmFzc2lnbiBtYXhzcGVlZF9mb3J3YXJkID0KICBzd2l0Y2ggbWF4c3BlZWQ6Zm9yd2FyZD01MCA1MAogIHN3aXRjaCBtYXhzcGVlZDpmb3J3YXJkPTMwIDMwCiAgc3dpdGNoIG1heHNwZWVkOmZvcndhcmQ9MTAgMTAKICBzd2l0Y2ggbWF4c3BlZWQ6Zm9yd2FyZD0yMCAyMAogIHN3aXRjaCBtYXhzcGVlZDpmb3J3YXJkPTQwIDQwCiAgc3dpdGNoIG1heHNwZWVkOmZvcndhcmQ9NjAgNjAKICBzd2l0Y2ggbWF4c3BlZWQ6Zm9yd2FyZD03MCA3MAogIHN3aXRjaCBtYXhzcGVlZDpmb3J3YXJkPTgwIDgwCiAgc3dpdGNoIG1heHNwZWVkOmZvcndhcmQ9OTAgOTAKICBzd2l0Y2ggbWF4c3BlZWQ6Zm9yd2FyZD0xMDAgMTAwCiAgc3dpdGNoIG1heHNwZWVkOmZvcndhcmQ9MTEwIDExMAogIHN3aXRjaCBtYXhzcGVlZDpmb3J3YXJkPTEyMCAxMjAKICBzd2l0Y2ggbWF4c3BlZWQ6Zm9yd2FyZD0xMzAgMTMwCiAgc3dpdGNoIG1heHNwZWVkOmZvcndhcmQ9dXJiYW4gNTAKICBzd2l0Y2ggbWF4c3BlZWQ6Zm9yd2FyZD1ydXJhbCAxMDAKICA5OTkKCmFzc2lnbiBtYXhzcGVlZF9iYWNrd2FyZCA9CiAgc3dpdGNoIG1heHNwZWVkOmJhY2t3YXJkPTUwIDUwCiAgc3dpdGNoIG1heHNwZWVkOmJhY2t3YXJkPTMwIDMwCiAgc3dpdGNoIG1heHNwZWVkOmJhY2t3YXJkPTEwIDEwCiAgc3dpdGNoIG1heHNwZWVkOmJhY2t3YXJkPTIwIDIwCiAgc3dpdGNoIG1heHNwZWVkOmJhY2t3YXJkPTQwIDQwCiAgc3dpdGNoIG1heHNwZWVkOmJhY2t3YXJkPTYwIDYwCiAgc3dpdGNoIG1heHNwZWVkOmJhY2t3YXJkPTcwIDcwCiAgc3dpdGNoIG1heHNwZWVkOmJhY2t3YXJkPTgwIDgwCiAgc3dpdGNoIG1heHNwZWVkOmJhY2t3YXJkPTkwIDkwCiAgc3dpdGNoIG1heHNwZWVkOmJhY2t3YXJkPTEwMCAxMDAKICBzd2l0Y2ggbWF4c3BlZWQ6YmFja3dhcmQ9MTEwIDExMAogIHN3aXRjaCBtYXhzcGVlZDpiYWNrd2FyZD0xMjAgMTIwCiAgc3dpdGNoIG1heHNwZWVkOmJhY2t3YXJkPTEzMCAxMzAKICBzd2l0Y2ggbWF4c3BlZWQ6YmFja3dhcmQ9dXJiYW4gNTAKICBzd2l0Y2ggbWF4c3BlZWQ6YmFja3dhcmQ9cnVyYWwgMTAwCiAgOTk5Cgphc3NpZ24gbWF4c3BlZWRfZXhwbGljaXQgPQogIHN3aXRjaCBtYXhzcGVlZD01MCA1MAogIHN3aXRjaCBtYXhzcGVlZD0zMCAzMAogIHN3aXRjaCBtYXhzcGVlZD0xMCAxMAogIHN3aXRjaCBtYXhzcGVlZD0yMCAyMAogIHN3aXRjaCBtYXhzcGVlZD00MCA0MAogIHN3aXRjaCBtYXhzcGVlZD02MCA2MAogIHN3aXRjaCBtYXhzcGVlZD03MCA3MAogIHN3aXRjaCBtYXhzcGVlZD04MCA4MAogIHN3aXRjaCBtYXhzcGVlZD05MCA5MAogIHN3aXRjaCBtYXhzcGVlZD0xMDAgMTAwCiAgc3dpdGNoIG1heHNwZWVkPTExMCAxMTAKICBzd2l0Y2ggbWF4c3BlZWQ9MTIwIDEyMAogIHN3aXRjaCBtYXhzcGVlZD0xMzAgMTMwCiAgc3dpdGNoIG1heHNwZWVkPXVyYmFuIDUwCiAgc3dpdGNoIG1heHNwZWVkPXJ1cmFsIDEwMAogIGlmIHJldmVyc2VkaXJlY3Rpb249eWVzIHRoZW4gbWF4c3BlZWRfYmFja3dhcmQgZWxzZSBtYXhzcGVlZF9mb3J3YXJkCgphc3NpZ24gbWF4c3BlZWQgPQogIG1pbiBvbmV3YXlzcGVlZGxpbWl0CiAgbWluIGFjY2Vzc3NwZWVkbGltaXQKICBtaW4gbWF4c3BlZWRfZXhwbGljaXQKICBtaW4gbWF4c3BlZWRfaW1wbGljaXQKICBtaW4gbWF4c3BlZWRfc3VyZmFjZSBtYXhzcGVlZF90cmFja3R5cGUKCmFzc2lnbiBub19yaXZlcl9wZW5hbHR5CiAgIHN3aXRjaCBjb25zaWRlcl9yaXZlcgogICAgIHN3aXRjaCBlc3RpbWF0ZWRfcml2ZXJfY2xhc3M9ICAxMAogICAgIHN3aXRjaCBlc3RpbWF0ZWRfcml2ZXJfY2xhc3M9MSAgMS4zCiAgICAgc3dpdGNoIGVzdGltYXRlZF9yaXZlcl9jbGFzcz0yICAxCiAgICAgc3dpdGNoIGVzdGltYXRlZF9yaXZlcl9jbGFzcz0zICAwLjcKICAgICBzd2l0Y2ggZXN0aW1hdGVkX3JpdmVyX2NsYXNzPTQgIDAuNAogICAgIHN3aXRjaCBlc3RpbWF0ZWRfcml2ZXJfY2xhc3M9NSAgMC4xCiAgICAgc3dpdGNoIGVzdGltYXRlZF9yaXZlcl9jbGFzcz02ICAwIDk5IDAKCmFzc2lnbiBub19mb3Jlc3RfcGVuYWx0eQogICBzd2l0Y2ggY29uc2lkZXJfZm9yZXN0CiAgICAgc3dpdGNoIGVzdGltYXRlZF9mb3Jlc3RfY2xhc3M9ICAxMAogICAgIHN3aXRjaCBlc3RpbWF0ZWRfZm9yZXN0X2NsYXNzPTEgIDAuNQogICAgIHN3aXRjaCBlc3RpbWF0ZWRfZm9yZXN0X2NsYXNzPTIgIDAuNAogICAgIHN3aXRjaCBlc3RpbWF0ZWRfZm9yZXN0X2NsYXNzPTMgIDAuMjUKICAgICBzd2l0Y2ggZXN0aW1hdGVkX2ZvcmVzdF9jbGFzcz00ICAwLjE1CiAgICAgc3dpdGNoIGVzdGltYXRlZF9mb3Jlc3RfY2xhc3M9NSAgMC4xCiAgICAgc3dpdGNoIGVzdGltYXRlZF9mb3Jlc3RfY2xhc3M9NiAgMCA5OSAwCgphc3NpZ24gdG93bl9wZW5hbHR5CiAgIHN3aXRjaCBjb25zaWRlcl90b3duCiAgICAgc3dpdGNoIGVzdGltYXRlZF90b3duX2NsYXNzPSAgMAogICAgIHN3aXRjaCBlc3RpbWF0ZWRfdG93bl9jbGFzcz0xICA1CiAgICAgc3dpdGNoIGVzdGltYXRlZF90b3duX2NsYXNzPTIgIDkKICAgICBzd2l0Y2ggZXN0aW1hdGVkX3Rvd25fY2xhc3M9MyAgMTIKICAgICBzd2l0Y2ggZXN0aW1hdGVkX3Rvd25fY2xhc3M9NCAgMTMKICAgICBzd2l0Y2ggZXN0aW1hdGVkX3Rvd25fY2xhc3M9NSAgMTQKICAgICBzd2l0Y2ggZXN0aW1hdGVkX3Rvd25fY2xhc3M9NiAgMTYgOTkgMAoKYXNzaWduIGNvc3RmYWN0b3IgPQogIGlmICggZXF1YWwgbWF4c3BlZWQgMCApIHRoZW4gMTAwMDAKICBlbHNlIGlmIGlzX2F2b2lkZWRfdG9sbF9yb2FkIHRoZW4gMTAwMDAKICBlbHNlIGlmIGlzX2F2b2lkZWRfbW90b3J3YXkgdGhlbiAxMAogIGVsc2UgbWluIDk5OTkKICBhZGQgdG93bl9wZW5hbHR5CiAgYWRkIG5vX2ZvcmVzdF9wZW5hbHR5CiAgYWRkIG5vX3JpdmVyX3BlbmFsdHkKICAwCgphc3NpZ24gbWluc3BlZWQgPQogICAgc3dpdGNoIGhpZ2h3YXk9bW90b3J3YXl8bW90b3J3YXlfbGlua3x0cnVuayAgNzUgMAoKIyB3YXkgcHJpb3JpdGllcyB1c2VkIGZvciB2b2ljZSBoaW50IGdlbmVyYXRpb24KCmFzc2lnbiBwcmlvcml0eWNsYXNzaWZpZXIgPQoKICBpZiAgICAgICggaGlnaHdheT1tb3RvcndheSAgICAgICAgICAgICAgICAgICkgdGhlbiAgMzAKICBlbHNlIGlmICggaGlnaHdheT1tb3RvcndheV9saW5rICAgICAgICAgICAgICkgdGhlbiAgMjkKICBlbHNlIGlmICggaGlnaHdheT10cnVuayAgICAgICAgICAgICAgICAgICAgICkgdGhlbiAgMjgKICBlbHNlIGlmICggaGlnaHdheT10cnVua19saW5rICAgICAgICAgICAgICAgICkgdGhlbiAgMjcKICBlbHNlIGlmICggaGlnaHdheT1wcmltYXJ5ICAgICAgICAgICAgICAgICAgICkgdGhlbiAgMjYKICBlbHNlIGlmICggaGlnaHdheT1wcmltYXJ5X2xpbmsgICAgICAgICAgICAgICkgdGhlbiAgMjUKICBlbHNlIGlmICggaGlnaHdheT1zZWNvbmRhcnkgICAgICAgICAgICAgICAgICkgdGhlbiAgMjQKICBlbHNlIGlmICggaGlnaHdheT1zZWNvbmRhcnlfbGluayAgICAgICAgICAgICkgdGhlbiAgMjMKICBlbHNlIGlmICggaGlnaHdheT10ZXJ0aWFyeSAgICAgICAgICAgICAgICAgICkgdGhlbiAgMjIKICBlbHNlIGlmICggaGlnaHdheT10ZXJ0aWFyeV9saW5rICAgICAgICAgICAgICkgdGhlbiAgMjEKICBlbHNlIGlmICggaGlnaHdheT11bmNsYXNzaWZpZWQgICAgICAgICAgICAgICkgdGhlbiAgMjAKICBlbHNlIGlmICggaXNyZXNpZGVudGlhbG9ybGl2aW5nICAgICAgICAgICAgICkgdGhlbiAgNgogIGVsc2UgaWYgKCBoaWdod2F5PXNlcnZpY2UgICAgICAgICAgICAgICAgICAgKSB0aGVuICA2CiAgZWxzZSBpZiAoIGhpZ2h3YXk9dHJhY2sgICAgICAgICAgICAgICAgICAgICApIHRoZW4gaWYgdHJhY2t0eXBlPWdyYWRlMSB0aGVuIDQgZWxzZSAyCiAgZWxzZSBpZiAoIGhpZ2h3YXk9YnJpZGxld2F5fHJvYWQgICAgICAgICAgICApIHRoZW4gIDIKICBlbHNlIDAKCiMgc29tZSBtb3JlIGNsYXNzaWZ5aW5nIGJpdHMgdXNlZCBmb3Igdm9pY2UgaGludCBnZW5lcmF0aW9uLi4uCgphc3NpZ24gaXNnb29kb25ld2F5ID0gaWYgcmV2ZXJzZWRpcmVjdGlvbj15ZXMgdGhlbiBvbmV3YXk9LTEKICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgb25ld2F5PSB0aGVuIGp1bmN0aW9uPXJvdW5kYWJvdXQgZWxzZSBvbmV3YXk9eWVzfHRydWV8MQphc3NpZ24gaXNyb3VuZGFib3V0ID0ganVuY3Rpb249cm91bmRhYm91dAphc3NpZ24gaXNnb29kZm9yY2FycyA9IGlmIGdyZWF0ZXIgcHJpb3JpdHljbGFzc2lmaWVyIDYgdGhlbiB0cnVlCiAgICAgICAgICAgICAgICAgIGVsc2UgaWYgb3IgaXNyZXNpZGVudGlhbG9ybGl2aW5nIGhpZ2h3YXk9c2VydmljZSB0aGVuIHRydWUKICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoIGFuZCBoaWdod2F5PXRyYWNrIHRyYWNrdHlwZT1ncmFkZTEgKSB0aGVuIHRydWUKICAgICAgICAgICAgICAgICAgZWxzZSBmYWxzZQoKIyAuLi4gZW5jb2RlZCBpbnRvIGEgYml0bWFzawoKYXNzaWduIGNsYXNzaWZpZXJtYXNrIGFkZCAgICAgICAgICBpc2JhZG9uZXdheQogICAgICAgICAgICAgICAgICAgICAgYWRkIG11bHRpcGx5IGlzZ29vZG9uZXdheSAgIDIKICAgICAgICAgICAgICAgICAgICAgIGFkZCBtdWx0aXBseSBpc3JvdW5kYWJvdXQgICA0CiAgICAgICAgICAgICAgICAgICAgICBhZGQgbXVsdGlwbHkgaXNsaW5rdHlwZSAgICAgOAogICAgICAgICAgICAgICAgICAgICAgYWRkIG11bHRpcGx5IGlzZ29vZGZvcmNhcnMgMTYKICAgICAgICAgICAgICAgICAgICAgIGFkZCBtdWx0aXBseSBpc3Jlc2lkZW50aWFsb3JsaXZpbmcgMzIKICAgICAgICAgICAgICAgICAgICAgICAgICBtdWx0aXBseSBjYXJhY2Nlc3NfZGVzdGluYXRpb24gNjQKCi0tLWNvbnRleHQ6bm9kZSAgIyBmb2xsb3dpbmcgY29kZSByZWZlcnMgdG8gbm9kZSB0YWdzCgojCiMgY2FsY3VsYXRlIGxvZ2ljYWwgY2FyIGFjY2VzcyB0byBub2RlcwojCmFzc2lnbiBjYXJhY2Nlc3MKICAgICAgIHN3aXRjaCBtb3RvcmNhcj0KICAgICAgICAgICAgICBzd2l0Y2ggbW90b3JfdmVoaWNsZT0KICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIHZlaGljbGU9CiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggYWNjZXNzPQogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vdCBiYXJyaWVyPWdhdGV8Ym9sbGFyZHxsaWZ0X2dhdGV8Y3ljbGVfYmFycmllcgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjY2Vzcz15ZXN8cGVybWlzc2l2ZXxkZXNpZ25hdGVkfGRlc3RpbmF0aW9uCiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZWhpY2xlPXllc3xwZXJtaXNzaXZlfGRlc2lnbmF0ZWR8ZGVzdGluYXRpb24KICAgICAgICAgICAgICAgICAgICAgbW90b3JfdmVoaWNsZT15ZXN8cGVybWlzc2l2ZXxkZXNpZ25hdGVkfGRlc3RpbmF0aW9uCiAgICAgICAgICAgICAgbW90b3JjYXI9eWVzfHBlcm1pc3NpdmV8ZGVzaWduYXRlZHxkZXN0aW5hdGlvbgoKYXNzaWduIGluaXRpYWxjb3N0ID0KICAgICAgIHN3aXRjaCBhbmQgYXZvaWRfdG9sbCBiYXJyaWVyPXRvbGxfYm9vdGggMTAwMDAwMAogICAgICAgc3dpdGNoIGNhcmFjY2VzcwogICAgICAgICAgICAgIDAKICAgICAgICAgICAgICAxMDAwMDAwCgphc3NpZ24gbWF4c3BlZWQgPQoKICAgICAgIGlmIG9yIGNyb3NzaW5nPXRyYWZmaWNfc2lnbmFscyBoaWdod2F5PXRyYWZmaWNfc2lnbmFscwogICAgICAgdGhlbgogICAgICAgICBzd2l0Y2ggZ3JlYXRlciB3YXk6cHJpb3JpdHljbGFzc2lmaWVyIDI0IDUKICAgICAgICAgc3dpdGNoIGdyZWF0ZXIgd2F5OnByaW9yaXR5Y2xhc3NpZmllciAyMiAzCiAgICAgICAgIHN3aXRjaCBncmVhdGVyIHdheTpwcmlvcml0eWNsYXNzaWZpZXIgMjAgMQogICAgICAgICAwCiAgICAgICBlbHNlIGlmIHJhaWx3YXk9bGV2ZWxfY3Jvc3NpbmcgdGhlbiAwCiAgICAgICBlbHNlIDk5OQo=';
  var curvyProfileId = load('curvyProfileId', null);
  // In-app update check: compares this build to the latest GitHub Release and shows a banner.
  var APP_VERSION = '1.0';
  var GH_REPO = 'mdozie7r/StormRoute';
  var recents = load('recents', []);

  // ---------- state ----------
  var S = {
    me: load('lastLoc', null),      // {lat, lon, acc, heading, speed}
    from: null,                     // {lat, lon, name} or null = my location
    to: null,
    route: null,                    // processed route
    nav: false,
    follow: true,
    offCount: 0, lastReroute: 0,
    spoken: {},                     // step index -> set of thresholds spoken
    routeWx: [], alerts: [],
    hereWx: null
  };

  // ---------- map ----------
  var map = L.map('map', { zoomControl: false, attributionControl: true, worldCopyJump: true })
    .setView(S.me ? [S.me.lat, S.me.lon] : [39.0, -76.6], S.me ? 13 : 9);
  map.attributionControl.setPrefix(false);

  // Esri basemaps: free to use with attribution, no API key (CARTO now requires one).
  var esri = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
  var attr = 'Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap contributors · Radar: IEM/NWS · Weather: Open-Meteo';
  var baseLight = L.tileLayer(esri + 'World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 19, maxNativeZoom: 17, attribution: attr });
  var baseDark = L.layerGroup([
    L.tileLayer(esri + 'Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, maxNativeZoom: 16, attribution: attr }),
    L.tileLayer(esri + 'Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, maxNativeZoom: 16 })
  ]);
  // Satellite: Esri World Imagery + a thin labels/roads reference layer on top.
  var baseSat = L.layerGroup([
    L.tileLayer(esri + 'World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, maxNativeZoom: 18, attribution: attr }),
    L.tileLayer(esri + 'Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, maxNativeZoom: 18 })
  ]);
  var base = null;

  map.createPane('traffic'); map.getPane('traffic').style.zIndex = 300;
  map.createPane('radar'); map.getPane('radar').style.zIndex = 350;
  map.createPane('alerts'); map.getPane('alerts').style.zIndex = 380;
  map.createPane('route'); map.getPane('route').style.zIndex = 420;

  function isDark() {
    if (prefs.theme === 'dark') return true;
    if (prefs.theme === 'light') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function applyTheme() {
    if (prefs.theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', prefs.theme);
    var want = prefs.satellite ? baseSat : (isDark() ? baseDark : baseLight);
    if (base !== want) { if (base) map.removeLayer(base); base = want.addTo(map); }
    Array.prototype.forEach.call($('themeSeg').children, function (b) { b.classList.toggle('on', b.dataset.t === prefs.theme); });
    if (NATIVE && NATIVE.setDarkBars) try { NATIVE.setDarkBars(isDark()); } catch (e) {}
    if (S.route) drawRoute();
  }
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(applyTheme);
  }

  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }

  // ---------- helpers ----------
  function toast(msg, ms) {
    var t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, ms || 3200);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fetchJSON(url, opts) {
    var ctrl = new AbortController(); var to = setTimeout(function () { ctrl.abort(); }, 15000);
    opts = opts || {}; opts.signal = ctrl.signal;
    return fetch(url, opts).then(function (r) { clearTimeout(to); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
  var R = 6371000;
  function rad(d) { return d * Math.PI / 180; }
  function hav(a, b) {
    var dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]);
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function fmtDist(m) {
    var mi = m / 1609.344;
    if (mi >= 10) return Math.round(mi) + ' mi';
    if (mi >= 0.1) return mi.toFixed(1) + ' mi';
    return Math.max(50, Math.round(m * 3.28084 / 50) * 50) + ' ft';
  }
  function spokenDist(m) {
    var mi = m / 1609.344;
    if (mi >= 0.9) return (Math.round(mi * 2) / 2) + (mi < 1.25 ? ' mile' : ' miles');
    if (mi >= 0.4) return 'half a mile';
    if (mi >= 0.2) return 'a quarter mile';
    return Math.round(m * 3.28084 / 100) * 100 + ' feet';
  }
  function fmtDur(s) {
    var m = Math.round(s / 60);
    if (m < 60) return m + ' min';
    var h = Math.floor(m / 60); return h + ' hr ' + (m % 60 ? (m % 60) + ' min' : '');
  }
  function fmtClock(t) { return new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
  function fmtHour(t) { return new Date(t).toLocaleTimeString([], { hour: 'numeric' }).replace(':00', '').replace(' ', '').toLowerCase(); }

  // ---------- weather icons ----------
  function wxKind(code) {
    if (code == null) return 'cloud';
    if (code === 0) return 'sun';
    if (code <= 2) return 'partly';
    if (code === 3) return 'cloud';
    if (code === 45 || code === 48) return 'fog';
    if (code >= 95) return 'storm';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if (code === 56 || code === 57 || code === 66 || code === 67) return 'ice';
    return 'rain';
  }
  var WXTEXT = { 0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Freezing fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 56: 'Freezing drizzle', 57: 'Freezing drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains', 80: 'Showers', 81: 'Showers', 82: 'Heavy showers', 85: 'Snow showers', 86: 'Heavy snow showers', 95: 'Thunderstorms', 96: 'Storms, hail', 99: 'Storms, hail' };
  function wxIcon(code, size, night) {
    var k = wxKind(code); size = size || 22;
    var sun = '<circle cx="12" cy="12" r="4.2" fill="#ffb81c"/><g stroke="#ffb81c" stroke-width="1.8" stroke-linecap="round"><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></g>';
    var moon = '<path d="M15.5 3.5a8 8 0 1 0 5 12.8A7 7 0 0 1 15.5 3.5Z" fill="#b9c6ff"/>';
    var cloud = function (y, c) { return '<path transform="translate(0 ' + (y || 0) + ')" d="M7 18h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.2A3.4 3.4 0 0 0 7 18Z" fill="' + (c || '#a9b7c9') + '"/>'; };
    var body;
    switch (k) {
      case 'sun': body = night ? moon : sun; break;
      case 'partly': body = '<g transform="translate(-3 -3) scale(.8)">' + (night ? moon : sun) + '</g>' + cloud(2, '#c3cedc'); break;
      case 'cloud': body = cloud(-1); break;
      case 'fog': body = cloud(-3) + '<g stroke="#a9b7c9" stroke-width="1.8" stroke-linecap="round"><path d="M5 19h14M7 22h10"/></g>'; break;
      case 'rain': body = cloud(-3) + '<g stroke="#3b8cff" stroke-width="2" stroke-linecap="round"><path d="M9 17.5l-1 3M13 17.5l-1 3M17 17.5l-1 3"/></g>'; break;
      case 'snow': body = cloud(-3) + '<g fill="#8fd3ff"><circle cx="8.5" cy="19" r="1.3"/><circle cx="12.5" cy="21" r="1.3"/><circle cx="16.5" cy="19" r="1.3"/></g>'; break;
      case 'ice': body = cloud(-3) + '<g stroke="#8fd3ff" stroke-width="2" stroke-linecap="round"><path d="M9 17.5l-1 3M16 17.5l-1 3"/></g><circle cx="12.5" cy="20" r="1.3" fill="#8fd3ff"/>'; break;
      case 'storm': body = cloud(-3, '#8796ab') + '<path d="M12.5 14l-3 5h3l-1.5 4 4.5-6h-3l1.5-3Z" fill="#ffb81c"/>'; break;
    }
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" aria-hidden="true">' + body + '</svg>';
  }
  function severity(h) { // h: {code, pop}
    if (h.code >= 95) return 'storm';
    if (h.code === 56 || h.code === 57 || h.code === 66 || h.code === 67 || (h.code >= 71 && h.code <= 86 && h.code !== 80 && h.code !== 81 && h.code !== 82)) return 'storm';
    if (h.code >= 61 || (h.pop != null && h.pop >= 60) || h.code === 45 || h.code === 48) return 'bad';
    return '';
  }

  // ---------- radar: past NEXRAD (5-min) + future forecast (Open-Meteo, hourly) ----------
  var RADAR_OFFSETS = [50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 0]; // minutes in the past
  var OBS = RADAR_OFFSETS.length;
  var FUTURE_HOURS = 12;
  var radarLayers = [], radarIdx = OBS - 1, radarTimer = null, radarStamp = Date.now();
  // Future = HRRR forecast reflectivity tiles from IEM — same radar look as the observed
  // past frames, keyless. Tiles pan/zoom natively, so no per-request rate limits.
  var futureLayers = [], futureTimes = [], hrrrInit = '', fcstToken = 0;
  var HRRR_META = 'https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json';
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function pad4(n) { n = '' + n; while (n.length < 4) n = '0' + n; return n; }
  function radarUrl(off) {
    return 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913' + (off ? '-m' + (off < 10 ? '0' : '') + off + 'm' : '') + '/{z}/{x}/{y}.png';
  }
  function hrrrUrl(init, mmmm) {
    return 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/hrrr::REFD-F' + mmmm + '-900913-' + init + '/{z}/{x}/{y}.png';
  }
  function futureCount() { return futureLayers.length || FUTURE_HOURS; }
  function frameCount() { return OBS + futureCount(); }
  function buildTicks() {
    var h = '', fut = futureCount();
    for (var i = 0; i < OBS; i++) h += '<i data-i="' + i + '"></i>';
    for (var k = 0; k < fut; k++) h += '<i class="fut" data-i="' + (OBS + k) + '"></i>';
    $('radarTicks').innerHTML = h;
  }
  function buildRadar() {
    radarLayers = RADAR_OFFSETS.map(function (off) {
      return L.tileLayer(radarUrl(off), { pane: 'radar', opacity: 0, maxNativeZoom: 12, maxZoom: 19, tileSize: 256, keepBuffer: 1, updateWhenIdle: true });
    });
    buildTicks();
  }
  function clearFuture() {
    futureLayers.forEach(function (l) { if (map.hasLayer(l)) map.removeLayer(l); });
    futureLayers = []; futureTimes = [];
  }
  function loadFuture(force) {
    if (!prefs.radar) return;
    var tok = ++fcstToken;
    fetchJSON(HRRR_META + '?t=' + Math.floor(Date.now() / 300000)).then(function (j) {
      if (tok !== fcstToken || !prefs.radar) return;
      var iso = j && j.model_init_utc; if (!iso) throw new Error('no init');
      var d = new Date(iso), initSec = d.getTime() / 1000;
      var init = '' + d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) + pad2(d.getUTCHours()) + pad2(d.getUTCMinutes());
      if (!force && init === hrrrInit && futureLayers.length) return; // same run already built
      hrrrInit = init; clearFuture();
      var now = Date.now() / 1000, seen = {};
      for (var k = 1; k <= FUTURE_HOURS; k++) {
        var off = Math.round((now + k * 3600 - initSec) / 900) * 15; // nearest 15-min forecast step
        if (off < 0) off = 0;
        if (off > 1080) break;
        if (seen[off]) continue; seen[off] = 1;
        futureLayers.push(L.tileLayer(hrrrUrl(init, pad4(off)), { pane: 'radar', opacity: 0, maxNativeZoom: 12, maxZoom: 19, tileSize: 256, keepBuffer: 1, updateWhenIdle: true }));
        futureTimes.push((initSec + off * 60) * 1000);
      }
      buildTicks();
      if (!radarTimer) showRadarFrame(Math.min(radarIdx, frameCount() - 1));
    }).catch(function () {
      if (tok !== fcstToken) return;
      if (!futureLayers.length && !radarTimer) showRadarFrame(Math.min(radarIdx, OBS - 1));
    });
  }
  function showRadarFrame(i) {
    radarIdx = i;
    radarLayers.forEach(function (l, j) { l.setOpacity(i < OBS && j === i ? 0.72 : 0); });
    futureLayers.forEach(function (l, j) { l.setOpacity(i >= OBS && j === i - OBS ? 0.72 : 0); });
    if (i < OBS) {
      var base5 = Math.floor((radarStamp - 4 * 60000) / 300000) * 300000; // latest composite lags ~4 min
      var off = RADAR_OFFSETS[i];
      $('radarTime').textContent = off === 0 ? 'Radar · now' : 'Radar · ' + fmtClock(base5 - off * 60000);
    } else {
      var k = i - OBS;
      if (futureLayers.length && futureTimes[k]) {
        var l = futureLayers[k]; if (!map.hasLayer(l)) l.addTo(map);
        var dh = Math.max(1, Math.round((futureTimes[k] - Date.now()) / 3600000));
        $('radarTime').textContent = 'Forecast · +' + dh + 'h · ' + fmtHour(futureTimes[k]);
      } else { $('radarTime').textContent = 'Forecast · loading…'; }
    }
    Array.prototype.forEach.call($('radarTicks').children, function (t, j) { t.classList.toggle('cur', j === i); });
  }
  function playIcon(p) { $('radarPlay').innerHTML = p ? '<svg width="14" height="14" viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor"/></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24"><path d="M7 4l13 8-13 8V4Z" fill="currentColor"/></svg>'; }
  function setRadar(on) {
    prefs.radar = on; save('prefs', prefs);
    $('radarBtn').classList.toggle('on', on);
    $('radarBar').hidden = !on;
    if (on) {
      if (!radarLayers.length) buildRadar();
      radarStamp = Date.now();
      radarIdx = OBS - 1;
      if (!map.hasLayer(radarLayers[OBS - 1])) radarLayers[OBS - 1].addTo(map);
      showRadarFrame(OBS - 1);
      loadFuture(true);
    } else {
      stopRadarLoop();
      radarLayers.forEach(function (l) { if (map.hasLayer(l)) map.removeLayer(l); });
      clearFuture(); fcstToken++;
    }
    syncLayerMenu();
  }
  function startRadarLoop() {
    radarLayers.forEach(function (l) { if (!map.hasLayer(l)) l.addTo(map); });
    futureLayers.forEach(function (l) { if (!map.hasLayer(l)) l.addTo(map); });
    playIcon(true);
    var n = 0;
    radarTimer = setInterval(function () {
      var total = frameCount(), next = (radarIdx + 1) % total;
      showRadarFrame(next);
      if (next === total - 1 && ++n > 4) stopRadarLoop(); // stop after a few loops to save data
    }, 550);
  }
  function stopRadarLoop() { clearInterval(radarTimer); radarTimer = null; playIcon(false); if (radarLayers.length) showRadarFrame(OBS - 1); }
  $('radarPlay').onclick = function () { radarTimer ? stopRadarLoop() : startRadarLoop(); };
  $('radarTicks').onclick = function (e) { var i = e.target.closest('i'); if (!i || !radarLayers.length) return; stopRadarLoop(); showRadarFrame(+i.dataset.i); };
  playIcon(false);
  setInterval(function () { // refresh every 5 minutes (new radar scan + maybe a new HRRR run)
    if (!prefs.radar || !radarLayers.length) return;
    radarStamp = Date.now();
    radarLayers.forEach(function (l, i) { l.setUrl(radarUrl(RADAR_OFFSETS[i]) + '?t=' + Math.floor(radarStamp / 300000)); });
    loadFuture(true);
    showRadarFrame(radarIdx);
  }, 300000);

  // ---------- live traffic (TomTom flow tiles + incidents) ----------
  var trafficLayer = null, trafficIncidents = L.layerGroup(), trafficTok = 0, trafficMoveT = null;
  var INC_CAT = { // iconCategory -> [label, color]
    0: ['Incident', '#fb8c00'], 1: ['Accident', '#e53935'], 2: ['Fog', '#90a4ae'], 3: ['Hazard', '#e53935'],
    4: ['Rain', '#039be5'], 5: ['Ice', '#039be5'], 6: ['Traffic jam', '#fb8c00'], 7: ['Lane closed', '#fb8c00'],
    8: ['Road closed', '#e53935'], 9: ['Road works', '#fdd835'], 10: ['Wind', '#90a4ae'], 11: ['Flooding', '#039be5'],
    14: ['Broken-down vehicle', '#fb8c00']
  };
  function incInfo(cat) { return INC_CAT[cat] || INC_CAT[0]; }
  function incPoint(g) {
    if (!g || !g.coordinates) return null;
    if (g.type === 'Point') return [g.coordinates[1], g.coordinates[0]];
    if (g.type === 'LineString' && g.coordinates.length) { var c = g.coordinates[Math.floor(g.coordinates.length / 2)]; return [c[1], c[0]]; }
    return null;
  }
  function incMarker(ll, color, label) {
    return L.marker(ll, { icon: L.divIcon({ className: '', html: '<div class="incpin" style="color:' + color + '"><svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 3 2 21h20L12 3Z" fill="currentColor" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 10v5" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.6" r="1.1" fill="#fff"/></svg></div>', iconSize: [22, 22], iconAnchor: [11, 11] }) }).bindTooltip(label, { direction: 'top' });
  }
  function trafficBBox() {
    if (S.route && S.route.coords && S.route.coords.length) {
      var la0 = 90, la1 = -90, lo0 = 180, lo1 = -180;
      S.route.coords.forEach(function (c) { la0 = Math.min(la0, c[0]); la1 = Math.max(la1, c[0]); lo0 = Math.min(lo0, c[1]); lo1 = Math.max(lo1, c[1]); });
      return [lo0, la0, lo1, la1];
    }
    var b = map.getBounds(); return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
  }
  function nearRoute(ll, maxM) {
    var c = S.route.coords, step = Math.max(1, Math.floor(c.length / 250));
    for (var i = 0; i < c.length; i += step) if (hav(ll, c[i]) < maxM) return true;
    return false;
  }
  function loadTrafficIncidents() {
    if (!prefs.traffic) return;
    var bb = trafficBBox(), tok = ++trafficTok, onRoute = !!(S.route && S.route.coords);
    var fields = '{incidents{type,geometry{type,coordinates},properties{iconCategory,events{description}}}}';
    var url = 'https://api.tomtom.com/traffic/services/5/incidentDetails?bbox=' + bb.join(',') +
      '&fields=' + encodeURIComponent(fields) + '&language=en-GB&key=' + TOMTOM_KEY;
    fetchJSON(url).then(function (j) {
      if (tok !== trafficTok || !prefs.traffic) return;
      trafficIncidents.clearLayers();
      (j.incidents || []).forEach(function (f) {
        var ll = incPoint(f.geometry); if (!ll) return;
        if (onRoute && !nearRoute(ll, 450)) return;
        var info = incInfo(f.properties && f.properties.iconCategory);
        var ev = f.properties && f.properties.events && f.properties.events[0];
        incMarker(ll, info[1], esc((ev && ev.description) || info[0])).addTo(trafficIncidents);
      });
    }).catch(function () {});
  }
  function refreshTrafficTiles() {
    if (trafficLayer) trafficLayer.setUrl('https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=' + TOMTOM_KEY + '&t=' + Math.floor(Date.now() / 120000));
  }
  function setTraffic(on) {
    prefs.traffic = on; save('prefs', prefs);
    if (on) {
      if (!trafficLayer) trafficLayer = L.tileLayer('https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=' + TOMTOM_KEY,
        { pane: 'traffic', maxZoom: 22, maxNativeZoom: 22, tileSize: 256, opacity: 0.9, updateWhenIdle: true });
      trafficLayer.addTo(map); trafficIncidents.addTo(map);
      loadTrafficIncidents();
    } else {
      if (trafficLayer && map.hasLayer(trafficLayer)) map.removeLayer(trafficLayer);
      trafficIncidents.clearLayers(); if (map.hasLayer(trafficIncidents)) map.removeLayer(trafficIncidents);
      trafficTok++;
    }
    syncLayerMenu();
  }
  map.on('moveend', function () { if (!prefs.traffic || S.route) return; clearTimeout(trafficMoveT); trafficMoveT = setTimeout(loadTrafficIncidents, 800); });
  setInterval(function () { if (!prefs.traffic) return; refreshTrafficTiles(); loadTrafficIncidents(); }, 120000);

  // ---------- speedometer + speed limit (GPS speed + TomTom Snap to Roads) ----------
  // Speed-limit lookups are the main API cost, so results are cached per ~150 m road
  // cell (persisted 3 days), and TomTom is called at most every 25 s after 200 m of
  // travel. Familiar roads cost nothing after the first pass.
  var SPEED_TRAIL = [], lastSnapAt = 0, lastSnapLL = null, speedLimit = null, lastMph = 0;
  var SL_CELL = 0.0015, SL_TTL = 3 * 86400000, SNAP_MS = 25000, SNAP_M = 200;
  var slCache = load('slCache', {}), slSaveT = null;
  function mps2mph(m) { return m * 2.2369362921; }
  function slKey(lat, lon) { return Math.round(lat / SL_CELL) + '_' + Math.round(lon / SL_CELL); }
  function saveSlCache() {
    clearTimeout(slSaveT);
    slSaveT = setTimeout(function () {
      var keys = Object.keys(slCache);
      if (keys.length > 500) { // keep the 400 freshest cells
        keys.sort(function (a, b) { return slCache[a].t - slCache[b].t; });
        for (var i = 0; i < keys.length - 400; i++) delete slCache[keys[i]];
      }
      save('slCache', slCache);
    }, 4000);
  }
  function applyOver() { $('speedHud').querySelector('.spd').classList.toggle('over', speedLimit != null && lastMph > speedLimit + 3); }
  function setLimit(v) {
    if (v > 0) { speedLimit = Math.round(v); $('limVal').textContent = speedLimit; $('spdLim').hidden = false; }
    else { speedLimit = null; $('spdLim').hidden = true; }
    applyOver();
  }
  function updateSpeedo(lat, lon, speed) {
    var hud = $('speedHud');
    if (!prefs.speedo || speed == null || isNaN(speed)) { hud.hidden = true; return; }
    hud.hidden = false;
    var mph = Math.max(0, Math.round(mps2mph(speed)));
    lastMph = mph; $('spdVal').textContent = mph; applyOver();
    if (!SPEED_TRAIL.length || hav([lat, lon], SPEED_TRAIL[SPEED_TRAIL.length - 1]) > 6) {
      SPEED_TRAIL.push([lat, lon]); if (SPEED_TRAIL.length > 4) SPEED_TRAIL.shift();
    }
    var now = Date.now(), key = slKey(lat, lon), c = slCache[key];
    if (c && now - c.t < SL_TTL) { setLimit(c.v); return; } // cached road — no API call
    var moved = lastSnapLL ? hav([lat, lon], lastSnapLL) : 1e9;
    if (speed > 1.5 && SPEED_TRAIL.length >= 2 && now - lastSnapAt > SNAP_MS && moved > SNAP_M) {
      lastSnapAt = now; lastSnapLL = [lat, lon]; fetchSpeedLimit(key);
    }
  }
  function fetchSpeedLimit(key) {
    var pts = SPEED_TRAIL.map(function (p) { return p[1].toFixed(5) + ',' + p[0].toFixed(5); }).join(';');
    var url = 'https://api.tomtom.com/snapToRoads/1?key=' + TOMTOM_KEY + '&points=' + pts +
      '&fields=' + encodeURIComponent('{route{properties{speedLimits{value,unit}}}}') +
      '&vehicleType=PassengerCar&measurementSystem=imperial';
    fetchJSON(url).then(function (j) {
      if (!prefs.speedo) return;
      var r = (j && j.route) || [], lim = null, unit = null;
      for (var i = r.length - 1; i >= 0; i--) {
        var sl = r[i].properties && r[i].properties.speedLimits;
        if (sl && sl.value) { lim = sl.value; unit = sl.unit; break; }
      }
      if (lim != null) {
        if (unit === 'kmph') lim = lim * 0.621371;
        lim = Math.round(lim);
        slCache[key] = { v: lim, t: Date.now() }; saveSlCache();
        setLimit(lim);
      } else { setLimit(0); }
    }).catch(function () {});
  }

  // ---------- my location ----------
  var meMarker = null, accCircle = null;
  function meIcon(heading) {
    var arrow = heading == null
      ? '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="' + cssVar('--accent') + '" stroke="#fff" stroke-width="3"/></svg>'
      : '<svg viewBox="0 0 20 20" style="transform:rotate(' + heading + 'deg)"><path d="M10 1 17.5 18 10 14 2.5 18Z" fill="' + cssVar('--accent') + '" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';
    return L.divIcon({ className: '', html: '<div class="me" style="position:relative"><div class="ring"></div>' + arrow + '</div>', iconSize: [26, 26], iconAnchor: [13, 13] });
  }
  function onLocation(lat, lon, acc, heading, speed) {
    var prev = S.me;
    if ((heading == null || isNaN(heading) || heading < 0) && prev && speed > 1.5) {
      var y = Math.sin(rad(lon - prev.lon)) * Math.cos(rad(lat));
      var x = Math.cos(rad(prev.lat)) * Math.sin(rad(lat)) - Math.sin(rad(prev.lat)) * Math.cos(rad(lat)) * Math.cos(rad(lon - prev.lon));
      heading = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    }
    if (!(speed > 1.5)) heading = prev && prev.heading != null && S.nav ? prev.heading : null;
    var first = !S.me;
    S.me = { lat: lat, lon: lon, acc: acc, heading: heading, speed: speed, t: Date.now() };
    save('lastLoc', { lat: lat, lon: lon });
    var ll = [lat, lon];
    if (!meMarker) { meMarker = L.marker(ll, { icon: meIcon(heading), interactive: false, zIndexOffset: 1000 }).addTo(map); accCircle = L.circle(ll, { radius: acc || 30, stroke: false, fillColor: cssVar('--accent'), fillOpacity: 0.1, interactive: false }).addTo(map); }
    else { meMarker.setLatLng(ll); meMarker.setIcon(meIcon(heading)); accCircle.setLatLng(ll); accCircle.setRadius(acc || 30); }
    updateSpeedo(lat, lon, speed);
    if (first && !S.route) { map.setView(ll, 13); loadHereWeather(); }
    if (S.nav) navTick();
    else if (S.follow && S.route == null && !first) { /* idle: don't move the map under the user's finger */ }
  }
  window.__onNativeLocation = onLocation; // called by the Android wrapper
  window.__onNativeLocationError = function (msg) { toast(msg || 'Location unavailable'); };

  function startLocation() {
    if (NATIVE && NATIVE.startLocation) { try { NATIVE.startLocation(); return; } catch (e) {} }
    if (!navigator.geolocation) { toast('Location is not available on this device'); return; }
    navigator.geolocation.watchPosition(function (p) {
      onLocation(p.coords.latitude, p.coords.longitude, p.coords.accuracy, p.coords.heading, p.coords.speed);
    }, function () { toast('Allow location access to navigate'); }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
  }
  $('locBtn').onclick = function () {
    if (!S.me) { toast('Finding your location…'); startLocation(); return; }
    S.follow = true; $('locBtn').classList.add('on');
    map.setView([S.me.lat, S.me.lon], Math.max(map.getZoom(), S.nav ? 16 : 14));
  };
  map.on('dragstart', function () { S.follow = false; $('locBtn').classList.remove('on'); });

  // ---------- search ----------
  var activeInput = null, suggestions = [], sugTimer = null, sugSeq = 0;
  function bias() { var c = S.me ? { lat: S.me.lat, lon: S.me.lon } : map.getCenter(); return '&lat=' + c.lat.toFixed(4) + '&lon=' + (c.lon != null ? c.lon : c.lng).toFixed(4); }
  function placeName(p) {
    var pr = p.properties || {};
    var title = pr.name || [pr.housenumber, pr.street].filter(Boolean).join(' ') || pr.city || 'Pinned place';
    var sub = [pr.name && pr.street ? [pr.housenumber, pr.street].filter(Boolean).join(' ') : null, pr.city || pr.county, pr.state].filter(Boolean).join(', ');
    return { title: title, sub: sub };
  }
  function renderSuggest(list, header) {
    var ul = $('suggest');
    if (!list.length) { ul.hidden = true; return; }
    ul.innerHTML = (header ? '<div class="eyebrow" style="padding:6px 12px 2px">' + header + '</div>' : '') +
      list.map(function (s, i) { return '<li data-i="' + i + '"><span class="t">' + esc(s.title) + '</span>' + (s.sub ? '<span class="s">' + esc(s.sub) + '</span>' : '') + '</li>'; }).join('');
    ul.hidden = false;
    suggestions = list;
  }
  function searchPlaces(q) {
    var seq = ++sugSeq;
    fetchJSON('https://photon.komoot.io/api/?q=' + encodeURIComponent(q) + '&limit=7&lang=en' + bias())
      .then(function (j) {
        if (seq !== sugSeq) return;
        renderSuggest((j.features || []).map(function (f) {
          var n = placeName(f); return { title: n.title, sub: n.sub, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] };
        }));
      }).catch(function () { if (seq === sugSeq) toast('Search is offline — check your connection'); });
  }
  function onType(e) {
    activeInput = e.target;
    var q = e.target.value.trim();
    clearTimeout(sugTimer);
    if (q.length < 3) { showRecents(); return; }
    sugTimer = setTimeout(function () { searchPlaces(q); }, 280);
  }
  function showRecents() {
    var list = recents.slice(0, 5);
    if (activeInput === $('fromInput')) list = [{ title: 'My location', sub: 'Use GPS', me: true }].concat(list);
    renderSuggest(list, list.length ? (activeInput === $('fromInput') ? 'Start from' : 'Recent') : null);
  }
  ['fromInput', 'toInput'].forEach(function (id) {
    var el = $(id);
    el.addEventListener('input', onType);
    el.addEventListener('focus', function () { activeInput = el; if (el.value.trim().length < 3) showRecents(); });
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' && suggestions[0]) { e.preventDefault(); pick(suggestions[0]); } });
  });
  $('suggest').addEventListener('click', function (e) {
    var li = e.target.closest('li'); if (!li) return; pick(suggestions[+li.dataset.i]);
  });
  document.addEventListener('pointerdown', function (e) {
    if (!e.target.closest('#search')) { $('suggest').hidden = true; }
    if (!e.target.closest('#layers') && !e.target.closest('#layersBtn')) $('layers').hidden = true;
  });
  function pick(s) {
    $('suggest').hidden = true;
    if (activeInput === $('fromInput')) {
      if (s.me) { S.from = null; $('fromInput').value = ''; }
      else { S.from = { lat: s.lat, lon: s.lon, name: s.title }; $('fromInput').value = s.title; }
    } else {
      S.to = { lat: s.lat, lon: s.lon, name: s.title, sub: s.sub };
      $('toInput').value = s.title;
      recents = [{ title: s.title, sub: s.sub, lat: s.lat, lon: s.lon }].concat(recents.filter(function (r) { return r.title !== s.title; })).slice(0, 8);
      save('recents', recents);
    }
    if (document.activeElement) document.activeElement.blur();
    if (S.to) planRoute();
  }
  $('swapBtn').onclick = function () {
    var meNow = S.me ? { lat: S.me.lat, lon: S.me.lon, name: 'My location' } : null;
    var a = S.from || meNow, b = S.to;
    if (!b) return;
    S.to = a && a.name !== 'My location' ? a : (a ? { lat: a.lat, lon: a.lon, name: 'My location' } : null);
    S.from = b;
    $('fromInput').value = S.from ? S.from.name : '';
    $('toInput').value = S.to ? S.to.name : '';
    if (S.to) planRoute();
  };
  $('clearBtn').onclick = function () { endNav(); clearRoute(); $('toInput').value = ''; S.to = null; renderIdle(); };

  // long-press the map to route there
  map.on('contextmenu', function (e) {
    S.to = { lat: e.latlng.lat, lon: e.latlng.lng, name: 'Dropped pin', sub: e.latlng.lat.toFixed(5) + ', ' + e.latlng.lng.toFixed(5) };
    $('toInput').value = 'Dropped pin';
    planRoute();
  });

  // ---------- routing ----------
  var routeLayer = null, casingLayer = null, destMarker = null, wxMarkers = L.layerGroup(), alertLayer = L.layerGroup();
  function clearRoute() {
    [routeLayer, casingLayer, destMarker].forEach(function (l) { if (l) map.removeLayer(l); });
    routeLayer = casingLayer = destMarker = null;
    wxMarkers.clearLayers(); alertLayer.clearLayers(); trafficIncidents.clearLayers();
    S.route = null; S.routeWx = []; S.alerts = [];
    $('clearBtn').hidden = true;
    if (prefs.traffic) loadTrafficIncidents();
  }
  function startPoint() {
    if (S.from) return S.from;
    if (S.me) return { lat: S.me.lat, lon: S.me.lon, name: 'My location' };
    return null;
  }
  function planRoute(fromNav) {
    var a = fromNav ? { lat: S.me.lat, lon: S.me.lon } : startPoint(), b = S.to;
    if (!a) { toast('Waiting for your location… or type a starting point'); startLocation(); return Promise.resolve(); }
    var curvy = prefs.routeMode === 'curvy';
    if (!fromNav) renderLoading(curvy ? 'Finding a curvy route…' : 'Finding the best route…');
    var p = curvy ? fetchCurvyRoute(a, b) : fetchFastRoute(a, b, fromNav);
    return p.then(function (route) {
      S.route = route;
      S.spoken = {};
      drawRoute();
      $('clearBtn').hidden = false;
      if (!fromNav) {
        map.fitBounds(L.latLngBounds(S.route.coords), { paddingTopLeft: [24, 140], paddingBottomRight: [24, 300] });
        renderPreview();
      }
      loadRouteWeather();
    }).catch(function (e) {
      if (fromNav) { toast('Could not reroute — keep driving, retrying'); return; }
      renderIdle(); toast(curvy ? 'No curvy route found. Try Quickest or another place.' : 'No driving route found. Try another place.');
    });
  }
  function fetchFastRoute(a, b, fromNav) {
    var url = 'https://router.project-osrm.org/route/v1/driving/' + a.lon + ',' + a.lat + ';' + b.lon + ',' + b.lat +
      '?overview=full&geometries=geojson&steps=true&annotations=duration,distance' +
      (fromNav && S.me.heading != null ? '&bearings=' + Math.round(S.me.heading) + ',60;&radiuses=50;unlimited' : '');
    return fetchJSON(url).then(function (j) {
      if (j.code !== 'Ok' || !j.routes || !j.routes.length) throw new Error(j.message || 'No route');
      return processRoute(j.routes[0]);
    });
  }

  // ---------- curvy routing (BRouter) ----------
  function uploadCurvyProfile() {
    var body = decodeURIComponent(escape(atob(CURVY_PROFILE_B64)));
    return fetch(BROUTER + '/profile', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: body })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j || !j.profileid) throw new Error('profile upload failed'); curvyProfileId = j.profileid; save('curvyProfileId', curvyProfileId); return curvyProfileId; });
  }
  function brouterRequest(a, b, id) {
    var url = BROUTER + '?lonlats=' + a.lon + ',' + a.lat + '|' + b.lon + ',' + b.lat + '&profile=' + id + '&alternativeidx=0&format=geojson';
    return fetchJSON(url).then(function (j) {
      if (!j || !j.features || !j.features.length) throw new Error('no curvy route');
      return processBRoute(j);
    });
  }
  function fetchCurvyRoute(a, b) {
    var attempt = curvyProfileId ? brouterRequest(a, b, curvyProfileId) : uploadCurvyProfile().then(function (id) { return brouterRequest(a, b, id); });
    // if a cached profile id has expired on the server, re-upload once and retry
    return attempt.catch(function () { return uploadCurvyProfile().then(function (id) { return brouterRequest(a, b, id); }); });
  }
  function processBRoute(j) {
    var f = j.features[0], p = f.properties || {};
    var raw = f.geometry.coordinates;
    var coords = raw.map(function (c) { return [c[1], c[0]]; });
    var dist = +p['track-length'] || 0, dur = +p['total-time'] || 0;
    var cumD = [0];
    for (var i = 1; i < coords.length; i++) cumD.push(cumD[i - 1] + hav(coords[i - 1], coords[i]));
    var cumT;
    if (p.times && p.times.length === coords.length) {
      cumT = p.times.map(Number);
      var last = cumT[cumT.length - 1] || dur || 1, scale = (dur || last) / (last || 1);
      cumT = cumT.map(function (t) { return t * scale; });
    } else {
      var totD = cumD[cumD.length - 1] || 1;
      cumT = cumD.map(function (d) { return dur * d / totD; });
    }
    if (!dist) dist = cumD[cumD.length - 1];
    return { coords: coords, cumD: cumD, cumT: cumT, dist: dist, dur: dur, steps: buildGeoSteps(coords, cumD), made: Date.now() };
  }
  function bearing(a, b) {
    var y = Math.sin(rad(b[1] - a[1])) * Math.cos(rad(b[0]));
    var x = Math.cos(rad(a[0])) * Math.sin(rad(b[0])) - Math.sin(rad(a[0])) * Math.cos(rad(b[0])) * Math.cos(rad(b[1] - a[1]));
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }
  function idxAtDist(cumD, d) { // nearest index at cumulative distance d
    var lo = 0, hi = cumD.length - 1;
    if (d <= 0) return 0; if (d >= cumD[hi]) return hi;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (cumD[mid] < d) lo = mid + 1; else hi = mid; }
    return lo;
  }
  function buildGeoSteps(coords, cumD) {
    var n = coords.length, total = cumD[n - 1], W = 30, steps = [];
    var b0 = bearing(coords[0], coords[idxAtDist(cumD, Math.min(total, 40))]);
    steps.push({ start: 0, dist: 0, dur: 0, m: { type: 'depart', bearing_after: b0 }, name: '' });
    var lastD = 0;
    for (var i = 1; i < n - 1; i++) {
      var d = cumD[i];
      if (d < 60 || d > total - 60) continue;
      var back = coords[idxAtDist(cumD, d - W)], fwd = coords[idxAtDist(cumD, d + W)];
      var diff = ((bearing(coords[i], fwd) - bearing(back, coords[i]) + 540) % 360) - 180, aa = Math.abs(diff);
      if (aa >= 50 && d - lastD > 250) {
        var mod = diff > 0 ? (aa > 105 ? 'sharp right' : 'right') : (aa > 105 ? 'sharp left' : 'left');
        steps.push({ start: d, dist: 0, dur: 0, m: { type: 'turn', modifier: mod }, name: '' });
        lastD = d;
      }
    }
    steps.push({ start: total, dist: 0, dur: 0, m: { type: 'arrive', modifier: '' }, name: '' });
    for (var k = 0; k < steps.length; k++) {
      steps[k].dist = k < steps.length - 1 ? steps[k + 1].start - steps[k].start : 0;
      steps[k].text = instruction({ maneuver: steps[k].m, name: '', ref: '', destinations: '', exits: '' });
    }
    return steps;
  }
  function processRoute(r) {
    var coords = r.geometry.coordinates.map(function (c) { return [c[1], c[0]]; });
    var ann = r.legs[0].annotation || {};
    var cumD = [0], cumT = [0];
    for (var i = 1; i < coords.length; i++) {
      var d = ann.distance ? ann.distance[i - 1] : hav(coords[i - 1], coords[i]);
      var t = ann.duration ? ann.duration[i - 1] : d / 20;
      cumD.push(cumD[i - 1] + d); cumT.push(cumT[i - 1] + t);
    }
    var scale = r.duration / (cumT[cumT.length - 1] || 1);
    cumT = cumT.map(function (t) { return t * scale; });
    var steps = [], acc = 0;
    r.legs[0].steps.forEach(function (s) {
      steps.push({ start: acc, dist: s.distance, dur: s.duration, m: s.maneuver, name: s.name, ref: s.ref, dest: s.destinations, exits: s.exits, rotary: s.rotary_name, mode: s.mode, text: instruction(s) });
      acc += s.distance;
    });
    return { coords: coords, cumD: cumD, cumT: cumT, dist: r.distance, dur: r.duration, steps: steps, made: Date.now() };
  }
  function drawRoute() {
    if (casingLayer) map.removeLayer(casingLayer);
    if (routeLayer) map.removeLayer(routeLayer);
    if (destMarker) map.removeLayer(destMarker);
    var c = S.route.coords;
    casingLayer = L.polyline(c, { pane: 'route', color: cssVar('--route-casing'), weight: 11, opacity: 0.95, lineJoin: 'round', interactive: false }).addTo(map);
    routeLayer = L.polyline(c, { pane: 'route', color: cssVar('--route'), weight: 7, opacity: 1, lineJoin: 'round', interactive: false }).addTo(map);
    destMarker = L.marker(c[c.length - 1], { icon: L.divIcon({ className: 'destpin', html: '<svg width="30" height="40" viewBox="0 0 30 40"><path d="M15 39C15 39 28 23.5 28 14A13 13 0 0 0 2 14c0 9.5 13 25 13 25Z" fill="' + cssVar('--danger') + '" stroke="#fff" stroke-width="2"/><circle cx="15" cy="14" r="5" fill="#fff"/></svg>', iconSize: [30, 40], iconAnchor: [15, 39] }) }).addTo(map);
    if (prefs.routewx) wxMarkers.addTo(map);
    if (prefs.alerts) alertLayer.addTo(map);
    if (prefs.traffic) { trafficIncidents.addTo(map); loadTrafficIncidents(); }
  }

  var COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
  function road(s) { return s.name || s.ref || ''; }
  function toward(s) { return s.destinations ? ' toward ' + s.destinations.split(',')[0] : ''; }
  function side(mod) { return mod && mod.indexOf('left') >= 0 ? 'left' : mod && mod.indexOf('right') >= 0 ? 'right' : ''; }
  function instruction(s) {
    var m = s.maneuver, mod = m.modifier || 'straight', r = road(s), onto = r ? ' onto ' + r : '';
    switch (m.type) {
      case 'depart': return 'Head ' + COMPASS[Math.round((m.bearing_after || 0) / 45) % 8] + (r ? ' on ' + r : '');
      case 'arrive': return 'Arrive at your destination' + (mod === 'left' || mod === 'right' ? ', on the ' + mod : '');
      case 'merge': return 'Merge' + (side(mod) ? ' ' + side(mod) : '') + onto;
      case 'on ramp': return 'Take the ramp' + (side(mod) ? ' on the ' + side(mod) : '') + (s.ref || s.name ? ' to ' + (s.ref || s.name) : '') + toward(s);
      case 'off ramp': return 'Take exit' + (s.exits ? ' ' + s.exits.split(';')[0] : '') + (side(mod) ? ' on the ' + side(mod) : '') + toward(s);
      case 'fork': return 'Keep ' + (side(mod) || 'straight') + ' at the fork' + (r ? ' onto ' + r : '') + toward(s);
      case 'roundabout': case 'rotary': case 'exit roundabout': case 'exit rotary':
        return 'At the ' + (m.type.indexOf('rotary') >= 0 ? 'traffic circle' : 'roundabout') + ', take the ' + ordinal(m.exit || 1) + ' exit' + onto;
      case 'roundabout turn': return 'At the roundabout, turn ' + side(mod) + onto;
      case 'end of road': return 'At the end of the road, turn ' + (side(mod) || 'right') + onto;
      case 'continue': case 'new name':
        if (mod === 'straight') return 'Continue' + (r ? ' on ' + r : ' straight');
        return turnWord(mod) + onto;
      default: return mod === 'straight' ? 'Continue' + (r ? ' on ' + r : '') : turnWord(mod) + onto;
    }
  }
  function turnWord(mod) {
    return { 'uturn': 'Make a U-turn', 'sharp right': 'Make a sharp right', 'right': 'Turn right', 'slight right': 'Bear right', 'straight': 'Continue straight', 'slight left': 'Bear left', 'left': 'Turn left', 'sharp left': 'Make a sharp left' }[mod] || 'Continue';
  }
  function ordinal(n) { return ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'][n - 1] || n + 'th'; }
  function arrowSvg(step, color, sz) {
    color = color || 'currentColor';
    var t = step.m.type, mod = step.m.modifier || 'straight';
    if (t === 'arrive') return '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 48 48"><path d="M14 44V6m0 2h20l-5 7 5 7H14" fill="none" stroke="' + color + '" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/></svg>';
    if (mod === 'uturn') return '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 48 48"><path d="M32 42V20a10 10 0 0 0-20 0v6m-6-6 6 7 6-7" fill="none" stroke="' + color + '" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var ang = { 'sharp right': 135, 'right': 90, 'slight right': 40, 'straight': 0, 'slight left': -40, 'left': -90, 'sharp left': -135 }[mod] || 0;
    if (t === 'roundabout' || t === 'rotary') return '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 48 48"><circle cx="24" cy="22" r="8" fill="none" stroke="' + color + '" stroke-width="4"/><path d="M24 44V30" stroke="' + color + '" stroke-width="4.5" stroke-linecap="round"/><g transform="rotate(' + ang + ' 24 22)"><path d="M24 14V4m-6 6 6-6 6 6" fill="none" stroke="' + color + '" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></g></svg>';
    // stem from bottom to center, then rotated head
    return '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 48 48"><path d="M24 44V26" stroke="' + color + '" stroke-width="4.5" stroke-linecap="round"/><g transform="rotate(' + ang + ' 24 26)"><path d="M24 26V8m-8 8 8-8 8 8" fill="none" stroke="' + color + '" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></g></svg>';
  }

  // ---------- weather along the route ----------
  function samplePoints() {
    var r = S.route, total = r.dist, n = Math.max(2, Math.min(10, Math.round(total / 15000) + 1));
    var pts = [], j = 0;
    for (var k = 0; k < n; k++) {
      var target = total * k / (n - 1);
      while (j < r.cumD.length - 1 && r.cumD[j] < target) j++;
      pts.push({ lat: r.coords[j][0], lon: r.coords[j][1], d: r.cumD[j], t: r.cumT[j], i: j });
    }
    return pts;
  }
  function loadRouteWeather() {
    var r = S.route; if (!r) return;
    var pts = samplePoints(), stamp = r.made;
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + pts.map(function (p) { return p.lat.toFixed(3); }).join(',') +
      '&longitude=' + pts.map(function (p) { return p.lon.toFixed(3); }).join(',') +
      '&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m,is_day&temperature_unit=fahrenheit&wind_speed_unit=mph&timeformat=unixtime&forecast_days=3';
    fetchJSON(url).then(function (j) {
      if (!S.route || S.route.made !== stamp) return;
      var arr = Array.isArray(j) ? j : [j];
      var depart = Date.now();
      S.routeWx = pts.map(function (p, k) {
        var h = arr[k].hourly, eta = depart + p.t * 1000, idx = 0;
        for (var q = 0; q < h.time.length; q++) { if (h.time[q] * 1000 <= eta) idx = q; else break; }
        return { lat: p.lat, lon: p.lon, d: p.d, eta: eta, temp: h.temperature_2m[idx], pop: h.precipitation_probability[idx], code: h.weather_code[idx], wind: h.wind_speed_10m[idx], day: h.is_day[idx] };
      });
      drawRouteWx();
      if (!S.nav) renderPreview(); else renderNavSheet();
    }).catch(function () { toast('Route weather unavailable right now'); });
    loadAlerts(pts, stamp);
  }
  function drawRouteWx() {
    wxMarkers.clearLayers();
    S.routeWx.forEach(function (w, k) {
      if (k === 0 && S.routeWx.length > 2) return; // skip the start; you can see it outside
      var sev = severity(w);
      L.marker([w.lat, w.lon], { interactive: false, icon: L.divIcon({ className: '', html: '<div class="wxpin ' + sev + '">' + wxIcon(w.code, 20, !w.day) + Math.round(w.temp) + '°</div>', iconSize: null, iconAnchor: k === S.routeWx.length - 1 ? [-16, 44] : [28, 30] }) }).addTo(wxMarkers);
    });
  }
  function routeSummary() {
    var w = S.routeWx; if (!w.length) return null;
    var worst = null;
    w.forEach(function (x) { var s = severity(x); if (s === 'storm' && (!worst || worst.s !== 'storm')) worst = { x: x, s: s }; else if (s === 'bad' && !worst) worst = { x: x, s: s }; });
    var lo = Math.round(Math.min.apply(null, w.map(function (x) { return x.temp; }))), hi = Math.round(Math.max.apply(null, w.map(function (x) { return x.temp; })));
    if (!worst) return { cls: '', code: w[w.length - 1].code, text: 'No rain expected on this drive · ' + (lo === hi ? lo + '°' : lo + '–' + hi + '°') };
    var x = worst.x, where = x.d < 1000 ? 'at the start' : 'around mile ' + Math.round(x.d / 1609.344);
    return { cls: worst.s, code: x.code, text: (WXTEXT[x.code] || 'Rain') + (x.pop ? ' (' + x.pop + '%)' : '') + ' ' + where + ', near ' + fmtClock(x.eta) };
  }
  function wxStripHtml() {
    if (!prefs.routewx) return '';
    if (!S.routeWx.length) return '<div class="row sm muted" style="margin-top:12px"><span class="spin"></span>Checking weather along the route…</div>';
    var sum = routeSummary();
    return '<div class="summary ' + sum.cls + '">' + wxIcon(sum.code, 26) + '<span>' + esc(sum.text) + '</span></div>' +
      '<div class="strip">' + S.routeWx.map(function (w, k) {
        var label = k === 0 ? 'Start' : k === S.routeWx.length - 1 ? 'Arrive' : 'Mi ' + Math.round(w.d / 1609.344);
        return '<div class="wp ' + severity(w) + '"><span class="m">' + label + ' · ' + fmtClock(w.eta) + '</span><span class="t num">' + wxIcon(w.code, 22, !w.day) + Math.round(w.temp) + '°</span><span class="m">' + (w.pop != null ? w.pop + '% rain' : '') + '</span></div>';
      }).join('') + '</div>';
  }

  // ---------- NWS alerts (US) ----------
  var SEVCOLOR = { Extreme: '--danger', Severe: '--danger', Moderate: '--warn', Minor: '--warn', Unknown: '--warn' };
  function loadAlerts(pts, stamp) {
    if (!prefs.alerts) return;
    var uniq = pts.filter(function (p, i) { return i % Math.max(1, Math.floor(pts.length / 6)) === 0 || i === pts.length - 1; });
    Promise.all(uniq.map(function (p) {
      return fetchJSON('https://api.weather.gov/alerts/active?point=' + p.lat.toFixed(4) + ',' + p.lon.toFixed(4), { headers: { Accept: 'application/geo+json' } }).catch(function () { return { features: [] }; });
    })).then(function (res) {
      if (!S.route || S.route.made !== stamp) return;
      var seen = {}, list = [];
      res.forEach(function (r) { (r.features || []).forEach(function (f) { if (!seen[f.id]) { seen[f.id] = 1; list.push(f); } }); });
      S.alerts = list;
      alertLayer.clearLayers();
      list.forEach(function (f) {
        if (!f.geometry) return;
        var c = cssVar(SEVCOLOR[f.properties.severity] || '--warn');
        L.geoJSON(f.geometry, { pane: 'alerts', interactive: false, style: { color: c, weight: 2, fillColor: c, fillOpacity: 0.12, dashArray: '6 4' } }).addTo(alertLayer);
      });
      if (S.nav) renderNavSheet(); else if (S.route) renderPreview();
      if (list.length && S.nav) speak('Weather alert on your route: ' + list[0].properties.event);
    });
  }
  function alertsHtml(max) {
    max = max || 3;
    if (!prefs.alerts || !S.alerts.length) return '';
    return S.alerts.slice(0, max).map(function (f) {
      var p = f.properties, cls = p.severity === 'Extreme' || p.severity === 'Severe' ? 'danger' : 'warn';
      var until = p.ends || p.expires;
      return '<div class="alert ' + cls + '"><svg width="20" height="20" viewBox="0 0 24 24" style="flex:none"><path d="M12 3 2 21h20L12 3Z" fill="currentColor"/><path d="M12 10v5M12 18v.5" stroke="var(--panel)" stroke-width="2.2" stroke-linecap="round"/></svg><div><b>' + esc(p.event) + '</b><span class="x">' + esc(p.areaDesc ? p.areaDesc.split(';').slice(0, 2).join(';') : '') + (until ? ' · until ' + esc(fmtClock(until)) : '') + '</span></div></div>';
    }).join('') + (S.alerts.length > max ? '<div class="sm muted" style="margin-top:6px">+' + (S.alerts.length - max) + ' more alerts on this route</div>' : '');
  }

  // ---------- weather here (idle) ----------
  function loadHereWeather() {
    var c = S.me ? { lat: S.me.lat, lon: S.me.lon } : { lat: map.getCenter().lat, lon: map.getCenter().lng };
    fetchJSON('https://api.open-meteo.com/v1/forecast?latitude=' + c.lat.toFixed(3) + '&longitude=' + c.lon.toFixed(3) +
      '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&hourly=temperature_2m,precipitation_probability,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&wind_speed_unit=mph&timeformat=unixtime&timezone=auto&forecast_days=2')
      .then(function (j) { S.hereWx = j; if (!S.route && !S.nav) renderIdle(); })
      .catch(function () { if (!S.route && !S.nav) renderIdle(true); });
    if (prefs.alerts) fetchJSON('https://api.weather.gov/alerts/active?point=' + c.lat.toFixed(4) + ',' + c.lon.toFixed(4)).then(function (j) {
      S.hereAlerts = j.features || []; if (!S.route && !S.nav) renderIdle();
    }).catch(function () {});
  }

  // ---------- sheet renderers ----------
  function sheet(html) { $('sheetBody').innerHTML = html; positionRadarBar(); }
  function positionRadarBar() { requestAnimationFrame(function () { var b = ($('sheet').offsetHeight + 12) + 'px'; $('radarBar').style.bottom = b; $('speedHud').style.bottom = b; }); }
  function renderLoading(msg) { sheet('<div class="row" style="padding:10px 0 6px"><span class="spin"></span><span>' + esc(msg) + '</span></div>'); }
  function renderIdle(failed) {
    var j = S.hereWx;
    if (!j) { sheet(failed ? '<div class="muted" style="padding:6px 0">Weather is unavailable — check your connection.</div>' : '<div class="row" style="padding:6px 0"><span class="spin"></span><span class="muted">Getting the weather where you are…</span></div>'); return; }
    var cur = j.current, h = j.hourly, now = Date.now() / 1000, start = 0;
    while (start < h.time.length - 1 && h.time[start + 1] <= now) start++;
    var hours = [];
    for (var i = start; i < Math.min(h.time.length, start + 12); i++) hours.push('<div class="hr"><span class="muted">' + (i === start ? 'Now' : fmtHour(h.time[i] * 1000)) + '</span>' + wxIcon(h.weather_code[i], 24, !h.is_day[i]) + '<b class="num">' + Math.round(h.temperature_2m[i]) + '°</b><span class="p">' + (h.precipitation_probability[i] >= 20 ? h.precipitation_probability[i] + '%' : '') + '</span></div>');
    var alerts = (prefs.alerts && S.hereAlerts && S.hereAlerts.length) ? S.hereAlerts.slice(0, 2).map(function (f) {
      var p = f.properties; return '<div class="alert ' + (p.severity === 'Severe' || p.severity === 'Extreme' ? 'danger' : 'warn') + '"><svg width="20" height="20" viewBox="0 0 24 24" style="flex:none"><path d="M12 3 2 21h20L12 3Z" fill="currentColor"/></svg><div><b>' + esc(p.event) + '</b><span class="x">' + esc(p.headline || '') + '</span></div></div>';
    }).join('') : '';
    sheet('<div class="row spread"><div><div class="eyebrow">Weather here</div><div class="row" style="gap:8px;margin-top:4px">' + wxIcon(cur.weather_code, 40, !cur.is_day) +
      '<span class="big num">' + Math.round(cur.temperature_2m) + '°</span></div></div><div style="text-align:right"><div style="font-weight:600">' + esc(WXTEXT[cur.weather_code] || '') + '</div><div class="sm muted num">H ' + Math.round(j.daily.temperature_2m_max[0]) + '° · L ' + Math.round(j.daily.temperature_2m_min[0]) + '°</div><div class="sm muted num">Feels ' + Math.round(cur.apparent_temperature) + '° · Wind ' + Math.round(cur.wind_speed_10m) + ' mph</div></div></div>' +
      alerts + '<div class="hours">' + hours.join('') + '</div>' +
      '<div class="sm muted" style="margin-top:8px">Search a destination, or press and hold the map to drop a pin.</div>');
  }
  function renderPreview() {
    var r = S.route; if (!r) return;
    var arrive = Date.now() + r.dur * 1000;
    sheet('<div class="seg" id="routeModeSeg" style="margin-bottom:10px"><button data-m="fast">Quickest</button><button data-m="curvy">Curvy</button></div>' +
      '<div class="row spread"><div><div class="big num">' + fmtDur(r.dur) + '</div><div class="muted num" style="margin-top:4px">' + fmtDist(r.dist) + ' · arrive ' + fmtClock(arrive) + '</div></div>' +
      '<div style="text-align:right;min-width:0"><div class="eyebrow">To</div><div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:44vw">' + esc(S.to.name) + '</div></div></div>' +
      alertsHtml() + wxStripHtml() +
      '<div class="btns"><button class="btn primary" id="goBtn"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M12 2 20 21 12 17 4 21Z" fill="currentColor"/></svg>Start</button>' +
      '<button class="btn ghost" id="gmapsBtn">Google Maps</button><button class="btn ghost" id="stepsBtn" aria-label="Show directions">Steps</button></div><ul id="steps" hidden></ul>');
    Array.prototype.forEach.call($('routeModeSeg').children, function (btn) { btn.classList.toggle('on', btn.dataset.m === prefs.routeMode); });
    $('routeModeSeg').onclick = function (e) { var btn = e.target.closest('button'); if (!btn || btn.dataset.m === prefs.routeMode) return; prefs.routeMode = btn.dataset.m; save('prefs', prefs); planRoute(); };
    $('goBtn').onclick = startNav;
    $('gmapsBtn').onclick = openGoogleMaps;
    $('stepsBtn').onclick = function () {
      var ul = $('steps'); ul.hidden = !ul.hidden;
      if (!ul.hidden && !ul.innerHTML) ul.innerHTML = S.route.steps.map(function (s) { return '<li>' + arrowSvg(s, cssVar('--accent'), 26) + '<span>' + esc(s.text) + '</span><span class="d num">' + (s.dist ? fmtDist(s.dist) : '') + '</span></li>'; }).join('');
      positionRadarBar();
    };
  }
  function openGoogleMaps() {
    var d = S.to.lat + ',' + S.to.lon;
    if (NATIVE && NATIVE.openGoogleMaps) { try { NATIVE.openGoogleMaps(S.to.lat, S.to.lon); return; } catch (e) {} }
    window.open('https://www.google.com/maps/dir/?api=1&destination=' + d + '&travelmode=driving', '_blank');
  }

  // ---------- turn-by-turn ----------
  function startNav() {
    if (!S.me) { toast('Waiting for GPS…'); startLocation(); return; }
    if (S.from) { // route was planned from another start; re-plan from here
      S.from = null; $('fromInput').value = '';
      planRoute().then(function () { if (S.route) startNav(); }); return;
    }
    S.nav = true; S.follow = true; S.offCount = 0; S.spoken = {};
    $('search').hidden = true; $('banner').hidden = false; $('locBtn').classList.add('on');
    if (NATIVE && NATIVE.keepScreenOn) try { NATIVE.keepScreenOn(true); } catch (e) {}
    map.setView([S.me.lat, S.me.lon], 16);
    navTick(true);
    speak(S.route.steps[0].text + (S.route.steps[1] ? ', then ' + S.route.steps[1].text.toLowerCase() : ''));
  }
  function endNav() {
    if (!S.nav) return;
    S.nav = false;
    $('search').hidden = false; $('banner').hidden = true;
    if (NATIVE && NATIVE.keepScreenOn) try { NATIVE.keepScreenOn(false); } catch (e) {}
    if (S.route) { renderPreview(); map.fitBounds(L.latLngBounds(S.route.coords), { paddingTopLeft: [24, 140], paddingBottomRight: [24, 300] }); }
  }
  // project current point onto route, returns {d: distance along, off: meters off-route, i: segment index}
  function project(p) {
    var r = S.route, best = { off: Infinity, d: 0, i: 0 };
    var lat0 = rad(p[0]), kx = Math.cos(lat0) * R * Math.PI / 180, ky = R * Math.PI / 180;
    var from = Math.max(0, (S.lastSeg || 0) - 40), to = r.coords.length - 1;
    for (var pass = 0; pass < 2; pass++) {
      for (var i = from; i < to; i++) {
        var a = r.coords[i], b = r.coords[i + 1];
        var ax = (a[1] - p[1]) * kx, ay = (a[0] - p[0]) * ky, bx = (b[1] - p[1]) * kx, by = (b[0] - p[0]) * ky;
        var dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy, t = L2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L2)) : 0;
        var x = ax + t * dx, y = ay + t * dy, dist = Math.sqrt(x * x + y * y);
        if (dist < best.off) best = { off: dist, i: i, d: r.cumD[i] + t * (r.cumD[i + 1] - r.cumD[i]), t: t };
      }
      if (best.off < 200 || from === 0) break; from = 0;
    }
    S.lastSeg = best.i;
    return best;
  }
  function navTick(initial) {
    var r = S.route; if (!r || !S.me) return;
    var p = [S.me.lat, S.me.lon], pr = project(p);
    // off-route → reroute
    if (pr.off > Math.max(45, (S.me.acc || 0) * 1.5)) S.offCount++; else S.offCount = 0;
    if (S.offCount >= 3 && Date.now() - S.lastReroute > 15000) {
      S.lastReroute = Date.now(); S.offCount = 0; S.lastSeg = 0;
      toast('Rerouting…'); speak('Rerouting');
      planRoute(true).then(function () { navTick(); }); return;
    }
    var remD = Math.max(0, r.dist - pr.d);
    var remT = Math.max(0, r.dur - (r.cumT[pr.i] + (pr.t || 0) * ((r.cumT[pr.i + 1] || r.cumT[pr.i]) - r.cumT[pr.i])));
    // next maneuver = first step starting after our position
    var k = 1; while (k < r.steps.length && r.steps[k].start <= pr.d + 5) k++;
    var next = r.steps[Math.min(k, r.steps.length - 1)], after = r.steps[k + 1];
    var toNext = Math.max(0, next.start - pr.d);
    $('bArrow').outerHTML = '<svg class="arrow" id="bArrow" viewBox="0 0 48 48">' + arrowSvg(next, cssVar('--accent-fg'), 48).replace(/^<svg[^>]*>|<\/svg>$/g, '') + '</svg>';
    $('bDist').textContent = fmtDist(toNext);
    $('bRoad').textContent = next.text;
    $('bThen').textContent = after && toNext < 2000 && after.start - next.start < 400 ? 'Then ' + after.text.toLowerCase() : '';
    // voice prompts
    var said = S.spoken[k] || (S.spoken[k] = {});
    var spd = Math.max(S.me.speed || 0, 8);
    var far = spd > 22 ? 1600 : 800;
    if (toNext < far && toNext > far * 0.6 && !said.far && !said.near) { said.far = 1; speak('In ' + spokenDist(toNext) + ', ' + next.text.charAt(0).toLowerCase() + next.text.slice(1)); }
    if (toNext < Math.max(120, spd * 8) && !said.near) { said.near = 1; said.far = 1; speak(next.text + (after && after.start - next.start < 300 ? ', then ' + after.text.toLowerCase() : '')); }
    // arrival
    if (remD < 30 || (next.m.type === 'arrive' && toNext < 25)) {
      speak('You have arrived'); toast('You have arrived at ' + S.to.name, 5000); endNav(); return;
    }
    S.navStats = { remD: remD, remT: remT };
    renderNavSheet();
    if (S.follow) map.panTo(p, { animate: !initial, duration: 0.6 });
  }
  function renderNavSheet() {
    if (!S.nav || !S.navStats) return;
    var st = S.navStats, dest = S.routeWx[S.routeWx.length - 1];
    var sum = prefs.routewx && S.routeWx.length ? routeSummary() : null;
    sheet('<div class="row spread"><div><div class="mid num" style="color:var(--good)">' + fmtDur(st.remT) + '</div><div class="muted sm num">' + fmtDist(st.remD) + ' · arrive ' + fmtClock(Date.now() + st.remT * 1000) + '</div></div>' +
      (dest ? '<div class="row" style="gap:6px">' + wxIcon(dest.code, 28, !dest.day) + '<div><div class="mid num">' + Math.round(dest.temp) + '°</div><div class="sm muted">at arrival</div></div></div>' : '') +
      '<button class="btn ghost" id="endBtn" style="color:var(--danger)">End</button></div>' +
      (sum && sum.cls ? '<div class="summary ' + sum.cls + '">' + wxIcon(sum.code, 24) + '<span>' + esc(sum.text) + '</span></div>' : '') +
      alertsHtml(1));
    $('endBtn').onclick = endNav;
  }

  // ---------- voice ----------
  function speak(text) {
    if (!prefs.voice || !text) return;
    if (NATIVE && NATIVE.speak) { try { NATIVE.speak(text); return; } catch (e) {} }
    if (window.speechSynthesis) { try { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(text)); } catch (e) {} }
  }

  // ---------- layer menu ----------
  function syncLayerMenu() {
    Array.prototype.forEach.call(document.querySelectorAll('#layers .opt'), function (b) { b.classList.toggle('on', !!prefs[b.dataset.layer]); });
  }
  $('layersBtn').onclick = function () { $('layers').hidden = !$('layers').hidden; syncLayerMenu(); };
  $('radarBtn').onclick = function () { setRadar(!prefs.radar); };
  document.querySelectorAll('#layers .opt').forEach(function (b) {
    b.onclick = function () {
      var k = b.dataset.layer;
      if (k === 'radar') { setRadar(!prefs.radar); return; }
      if (k === 'traffic') { setTraffic(!prefs.traffic); return; }
      prefs[k] = !prefs[k]; save('prefs', prefs); syncLayerMenu();
      if (k === 'satellite') applyTheme();
      if (k === 'speedo') { if (!prefs.speedo) $('speedHud').hidden = true; else if (S.me) updateSpeedo(S.me.lat, S.me.lon, S.me.speed); }
      if (k === 'routewx') { if (prefs.routewx) wxMarkers.addTo(map); else map.removeLayer(wxMarkers); }
      if (k === 'alerts') { if (prefs.alerts) { alertLayer.addTo(map); if (S.route) loadAlerts(samplePoints(), S.route.made); } else map.removeLayer(alertLayer); }
      if (S.nav) renderNavSheet(); else if (S.route) renderPreview(); else renderIdle();
    };
  });
  $('themeSeg').onclick = function (e) { var b = e.target.closest('button'); if (!b) return; prefs.theme = b.dataset.t; save('prefs', prefs); applyTheme(); };

  // Android back button: close menus, end nav, clear route
  window.__onBack = function () {
    if (!$('layers').hidden) { $('layers').hidden = true; return true; }
    if (!$('suggest').hidden) { $('suggest').hidden = true; return true; }
    if (S.nav) { endNav(); return true; }
    if (S.route) { $('clearBtn').onclick(); return true; }
    return false;
  };
  // resume from background: refresh weather
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    if (S.route && Date.now() - S.route.made > 20 * 60000 && !S.nav) loadRouteWeather();
    if (!S.route) loadHereWeather();
  });

  // ---------- in-app update check ----------
  function verCmp(a, b) {
    var pa = String(a).replace(/^v/i, '').split('.').map(Number), pb = String(b).replace(/^v/i, '').split('.').map(Number);
    for (var i = 0; i < Math.max(pa.length, pb.length); i++) { var x = pa[i] || 0, y = pb[i] || 0; if (x !== y) return x - y; }
    return 0;
  }
  function showUpdate(tag, url) {
    if (!tag || verCmp(tag, APP_VERSION) <= 0) return;
    if (load('updDismissed', '') === tag) return;
    $('updVer').textContent = String(tag).replace(/^v/i, '');
    $('updGet').onclick = function () { if (url) location.href = url; };
    $('updClose').onclick = function () { save('updDismissed', tag); $('updateBar').hidden = true; };
    $('updateBar').hidden = false;
  }
  function checkUpdate() {
    var c = load('updCheck', null), now = Date.now();
    if (c && c.tag && now - c.at < 6 * 3600000) { showUpdate(c.tag, c.url); return; } // throttle to every 6h
    fetchJSON('https://api.github.com/repos/' + GH_REPO + '/releases/latest').then(function (j) {
      var apk = (j.assets || []).filter(function (a) { return /\.apk$/i.test(a.name); })[0];
      var url = apk ? apk.browser_download_url : j.html_url;
      save('updCheck', { at: now, tag: j.tag_name, url: url });
      showUpdate(j.tag_name, url);
    }).catch(function () {});
  }

  // ---------- boot ----------
  applyTheme();
  setRadar(prefs.radar);
  setTraffic(prefs.traffic);
  renderIdle();
  startLocation();
  loadHereWeather();
  checkUpdate();
  window.addEventListener('resize', positionRadarBar);
  window.__stormroute = S; // for debugging
})();
