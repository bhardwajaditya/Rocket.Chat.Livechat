(window.webpackJsonp=window.webpackJsonp||[]).push([[66],{POey:function(t,e,r){"use strict";r.r(e);var n=r("hosL"),a=r("co3k"),o=r("z4Qk"),i=r("qoM+"),c=r("jdJj"),u=r("PyG4"),l=r("fsQa"),s=r("Aimb"),d=r.n(s);function h(){return(h=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var r=arguments[e];for(var n in r)Object.prototype.hasOwnProperty.call(r,n)&&(t[n]=r[n])}return t}).apply(this,arguments)}function f(t,e){var r;if("undefined"==typeof Symbol||null==t[Symbol.iterator]){if(Array.isArray(t)||(r=function(t,e){if(!t)return;if("string"==typeof t)return p(t,e);var r=Object.prototype.toString.call(t).slice(8,-1);"Object"===r&&t.constructor&&(r=t.constructor.name);if("Map"===r||"Set"===r)return Array.from(t);if("Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r))return p(t,e)}(t))||e&&t&&"number"==typeof t.length){r&&(t=r);var n=0;return function(){return n>=t.length?{done:!0}:{done:!1,value:t[n++]}}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}return(r=t[Symbol.iterator]()).next.bind(r)}function p(t,e){(null==e||e>t.length)&&(e=t.length);for(var r=0,n=new Array(e);r<e;r++)n[r]=t[r];return n}function m(t,e){var r=Object.keys(t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(t);e&&(n=n.filter((function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable}))),r.push.apply(r,n)}return r}function v(t){for(var e=1;e<arguments.length;e++){var r=null!=arguments[e]?arguments[e]:{};e%2?m(Object(r),!0).forEach((function(e){b(t,e,r[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(r)):m(Object(r)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(r,e))}))}return t}function b(t,e,r){return e in t?Object.defineProperty(t,e,{value:r,enumerable:!0,configurable:!0,writable:!0}):t[e]=r,t}var y=l.a.t("Change Department"),g=l.a.t("Choose a department"),O=function(t){var e,r;function s(e){var r;(r=t.call(this,e)||this).state={department:null},r.validations={department:[i.e.nonEmpty]},r.getValidableFields=function(){return Object.keys(r.validations).map((function(t){return r.state[t]?v({fieldName:t},r.state[t]):null})).filter(Boolean)},r.validate=function(t){var e=t.name,n=t.value;return r.validations[e].reduce((function(t,e){return t||e({value:n})}),void 0)},r.validateAll=function(){for(var t,e=f(r.getValidableFields());!(t=e()).done;){var n,a=t.value,o=a.fieldName,i=a.value,c=r.validate({name:o,value:i});r.setState(((n={})[o]=v(v({},r.state[o]),{},{value:i,error:c,showError:!1}),n))}},r.isValid=function(){return r.getValidableFields().every((function(t){return!(void 0===t?{}:t).error}))},r.handleFieldChange=function(t){return function(e){var n,a=e.target.value,o=r.validate({name:t,value:a});r.setState(((n={})[t]=v(v({},r.state[t]),{},{value:a,error:o,showError:!1}),n)),r.validateAll()}},r.handleDepartmentChange=r.handleFieldChange("department"),r.handleSubmit=function(t){if(t.preventDefault(),r.props.onSubmit){var e=Object.entries(r.state).filter((function(t){return null!==t[1]})).map((function(t){var e,r=t[0],n=t[1].value;return(e={})[r]=n,e})).reduce((function(t,e){return v(v({},t),e)}),{});r.props.onSubmit(e)}},r.handleCancelClick=function(){var t=r.props.onCancel;t&&t()};var n=e.departments;return n&&n.length>0&&(r.state.department={value:""}),r}r=t,(e=s).prototype=Object.create(r.prototype),e.prototype.constructor=e,e.__proto__=r,s.getDerivedStateFromProps=function(t,e){return t.departments&&t.departments.length>0&&!e.department?{department:{value:""}}:t.departments&&0!==t.departments.length?null:{department:null}};var p=s.prototype;return p.componentDidMount=function(){this.validateAll()},p.render=function(t,e){var r=e.department,s=t.title,f=t.color,p=t.message,m=t.loading,v=t.departments,b=function(t,e){if(null==t)return{};var r,n,a={},o=Object.keys(t);for(n=0;n<o.length;n++)r=o[n],e.indexOf(r)>=0||(a[r]=t[r]);return a}(t,["title","color","message","loading","departments"]),O=this.isValid();return Object(n.h)(c.b,h({color:f,title:s||y,className:Object(u.d)(d.a,"switch-department")},b),Object(n.h)(c.b.Content,null,Object(n.h)("p",{className:Object(u.d)(d.a,"switch-department__message")},p||g),Object(n.h)(i.a,{onSubmit:this.handleSubmit},Object(n.h)(i.b,{label:l.a.t("Departments"),error:r&&r.showError&&r.error},Object(n.h)(i.c,{name:"department",value:r&&r.value,options:v.map((function(t){return{value:t._id,label:t.name}})),placeholder:l.a.t("Choose a department..."),disabled:m,error:r&&r.showError,onInput:this.handleDepartmentChange})),Object(n.h)(o.a,null,Object(n.h)(a.a,{submit:!0,loading:m,disabled:!O||m,stack:!0},l.a.t("Start chat")),Object(n.h)(a.a,{disabled:m,stack:!0,secondary:!0,nude:!0,onClick:this.handleCancelClick},l.a.t("Cancel"))))),Object(n.h)(c.b.Footer,null))},s}(n.Component),j=r("qPgm"),w=r("81xT"),C=r("SGp1"),P=r("UEyv"),S=r("kQFM");function k(){return(k=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var r=arguments[e];for(var n in r)Object.prototype.hasOwnProperty.call(r,n)&&(t[n]=r[n])}return t}).apply(this,arguments)}var D=function(t){var e,r;function a(){for(var e,r=arguments.length,a=new Array(r),o=0;o<r;o++)a[o]=arguments[o];return(e=t.call.apply(t,[this].concat(a))||this).confirmChangeDepartment=function(){return new Promise((function(t,e){var r;return Promise.resolve(w.a.confirm({text:l.a.t("Are you sure you want to switch the department?")})).then((function(n){try{return t("boolean"==typeof(r=n).success&&r.success)}catch(t){return e(t)}}),e)}))},e.handleSubmit=function(t){return new Promise((function(r,n){var a,o,i,c,s,d,h,f;return a=e.props,o=a.alerts,i=a.dispatch,c=a.room,s=a.token,d=t.department,Promise.resolve(e.confirmChangeDepartment()).then(function(t){try{if(!t)return r();if(!c)return Promise.resolve(j.a.grantVisitor({visitor:{department:d,token:s}})).then((function(t){try{return h=t,Promise.resolve(i({user:h,alerts:(o.push({id:Object(u.e)(),children:l.a.t("Department switched"),success:!0}),o)})).then((function(t){try{return r(C.a.go(-1))}catch(t){return n(t)}}),n)}catch(t){return n(t)}}),n);var e=function(t){return function(e){try{return Promise.resolve(i({loading:!1})).then(function(r){try{return t&&t.call(this,e)}catch(t){return n(t)}}.bind(this),n)}catch(t){return n(t)}}.bind(this)}.bind(this);return Promise.resolve(i({loading:!0})).then((function(t){try{var a=function(){try{return r()}catch(t){return n(t)}},s=function(t){try{return console.error(t),Promise.resolve(i({alerts:(o.push({id:Object(u.e)(),children:l.a.t("No available agents to transfer"),warning:!0}),o)})).then((function(t){try{return e(a)()}catch(t){return n(t)}}),n)}catch(t){return e(n)(t)}};try{return f=c._id,Promise.resolve(j.a.transferChat({rid:f,department:d})).then((function(t){try{if(!t.success)throw l.a.t("No available agents to transfer");return Promise.resolve(i({department:d,loading:!1})).then((function(t){try{return Promise.resolve(Object(P.a)()).then((function(t){try{return Promise.resolve(w.a.alert({text:l.a.t("Department switched")})).then((function(t){try{return C.a.go(-1),e(a)()}catch(t){return s(t)}}),s)}catch(t){return s(t)}}),s)}catch(t){return s(t)}}),s)}catch(t){return s(t)}}),s)}catch(t){s(t)}}catch(t){return n(t)}}),n)}catch(t){return n(t)}}.bind(this),n)}))},e.handleCancel=function(){C.a.go(-1)},e.render=function(t){return Object(n.h)(O,k({},t,{onSubmit:e.handleSubmit,onCancel:e.handleCancel}))},e}return r=t,(e=a).prototype=Object.create(r.prototype),e.prototype.constructor=e,e.__proto__=r,a}(n.Component),_=function(t){var e=t.ref,r=function(t,e){if(null==t)return{};var r,n,a={},o=Object.keys(t);for(n=0;n<o.length;n++)r=o[n],e.indexOf(r)>=0||(a[r]=t[r]);return a}(t,["ref"]);return Object(n.h)(S.a,null,(function(t){var a=t.config,o=(a=void 0===a?{}:a).departments,i=void 0===o?{}:o,c=a.theme,u=(c=void 0===c?{}:c).color,l=t.iframe,s=(l=void 0===l?{}:l).theme,d=(s=void 0===s?{}:s).color,h=s.fontColor,f=s.iconColor,p=t.room,m=t.loading,v=void 0!==m&&m,b=t.department,y=t.dispatch,g=t.alerts,O=t.token;return Object(n.h)(D,k({ref:e},r,{theme:{color:d||u,fontColor:h,iconColor:f},loading:v,departments:i.filter((function(t){return t.showOnRegistration&&t._id!==b})),dispatch:y,room:p,alerts:g,token:O}))}))},A=_;r.d(e,"SwitchDepartment",(function(){return O})),r.d(e,"SwitchDepartmentContainer",(function(){return D})),r.d(e,"SwitchDepartmentConnector",(function(){return _})),r.d(e,"default",(function(){return A}))}}]);
//# sourceMappingURL=route-SwitchDepartment.chunk.de307.esm.js.map