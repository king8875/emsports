/* =========================================================
   EMSPORTS main — GSAP + ScrollTrigger
   Revolut 메인의 스크롤 연출(고정 히어로 → 시트 덮기, 줄 단위 리빌,
   2줄 마퀴, 패럴랙스)을 재해석. 슬라이더는 Swiper.
   ========================================================= */
(function () {
	"use strict";

	if (!window.gsap || !window.ScrollTrigger) return;
	gsap.registerPlugin(ScrollTrigger);
	ScrollTrigger.config({ ignoreMobileResize: true }); // 모바일 주소창 높이 변화로 인한 재계산 방지
	gsap.defaults({ ease: "power3.out", duration: 1 });

	var $ = function (s, c) { return (c || document).querySelector(s); };
	var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

	var header = $("#header");
	var totop = $("#totop");

	/* ---------------------------------------------------------
	   Mobile navigation (모션 설정과 무관하게 동작)
	   --------------------------------------------------------- */
	(function mobileNav() {
		var burger = $("#burger");
		var mnav = $("#mnav");
		if (!burger || !mnav) return;
		var items = $$(".mnav__list > li, .mnav__cta", mnav);
		var open = false;

		var tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } })
			.set(mnav, { visibility: "visible" })
			.fromTo(mnav, { autoAlpha: 0, clipPath: "circle(0% at calc(100% - 40px) 32px)" },
				{ autoAlpha: 1, clipPath: "circle(150% at calc(100% - 40px) 32px)", duration: .7 }, 0)
			.fromTo(items, { yPercent: 40, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, stagger: .06, duration: .6 }, .2)
			.eventCallback("onReverseComplete", function () { gsap.set(mnav, { clearProps: "clipPath" }); });

		function toggle(force) {
			open = typeof force === "boolean" ? force : !open;
			burger.setAttribute("aria-expanded", open);
			burger.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
			mnav.setAttribute("aria-hidden", !open);
			mnav.classList.toggle("is-open", open);
			header.classList.toggle("is-menu-open", open);
			document.body.classList.toggle("is-locked", open);
			open ? tl.timeScale(1).play() : tl.timeScale(1.4).reverse();
		}
		burger.addEventListener("click", function () { toggle(); });
		$$("a", mnav).forEach(function (a) { a.addEventListener("click", function () { toggle(false); }); });
		window.addEventListener("keydown", function (e) { if (e.key === "Escape" && open) toggle(false); });
		window.matchMedia("(min-width: 1024px)").addEventListener("change", function (e) { if (e.matches && open) toggle(false); });
	})();

	/* Back to top */
	if (totop) {
		totop.addEventListener("click", function () {
			window.scrollTo({ top: 0, behavior: "smooth" });
		});
	}

	/* ---------------------------------------------------------
	   helpers
	   --------------------------------------------------------- */
	// <br> 기준으로 줄을 나눠 마스크(overflow hidden)로 감싼다.
	function splitLines(el) {
		if (el.dataset.split) return $$(".line__in", el);
		var parts = el.innerHTML.split(/<br\s*\/?>/i);
		el.innerHTML = parts.map(function (p) {
			return '<span class="line"><span class="line__in">' + p + "</span></span>";
		}).join("");
		el.dataset.split = "1";
		return $$(".line__in", el);
	}


	/* ---------------------------------------------------------
	   헤더: 히어로를 지나면 흰색 바 (모션 설정과 무관하게 동작)
	   --------------------------------------------------------- */
	ScrollTrigger.create({
		trigger: "#intro", start: "top 72px", end: "max",
		// end 지점(페이지 맨 아래)에서 클래스가 빠지지 않도록 진입/역진입 때만 토글
		onEnter: function () { header.classList.add("is-solid"); },
		onLeaveBack: function () { header.classList.remove("is-solid"); },
		onRefresh: function (self) { header.classList.toggle("is-solid", self.scroll() >= self.start); }
	});

	/* ---------------------------------------------------------
	   Rental carousel (Swiper)
	   --------------------------------------------------------- */
	if (window.Swiper && $(".rental-swiper")) {
		new Swiper(".rental-swiper", {
			slidesPerView: "auto",
			spaceBetween: 20,
			grabCursor: true,
			speed: 600
		});
	}

	/* ---------------------------------------------------------
	   Scroll animations
	   --------------------------------------------------------- */
	var mm = gsap.matchMedia();

	// 모션 줄이기 설정이면 모든 스크롤 연출을 건너뛴다(콘텐츠는 기본 상태로 표시)
	mm.add("(prefers-reduced-motion: no-preference)", function () {
		/* ---- 1. HERO ---- */
		var heroLines = $$("[data-hero-title] .line__in");
		var introTl = gsap.timeline({ defaults: { ease: "power4.out" } });
		introTl
			.from(".hero__bg", { scale: 1.3, duration: 2.2, ease: "power2.out" }, 0)
			.from(heroLines, { yPercent: 115, duration: 1.2, stagger: .12 }, .15)
			.from("[data-hero-fade]", { y: 28, autoAlpha: 0, duration: 1, stagger: .12 }, .6);

		// 히어로 고정 + 다음 섹션이 시트처럼 덮고 올라옴
		var heroTl = gsap.timeline({
			defaults: { ease: "none" },
			scrollTrigger: { trigger: "#hero", start: "top top", end: "+=100%", pin: ".hero__pin", pinSpacing: false, scrub: true }
		});
		heroTl
			.to(".hero__content", { yPercent: -18, autoAlpha: 0, duration: .7 }, 0)
			.fromTo(".hero__bg", { scale: 1 }, { scale: 1.08, duration: 1, immediateRender: false }, 0);

		/* ---- 공통: 줄 단위 마스크 리빌 ---- */
		$$("[data-lines]").forEach(function (el) {
			var lines = splitLines(el);
			gsap.from(lines, {
				yPercent: 115, duration: 1.1, stagger: .1, ease: "power4.out",
				scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none none" }
			});
		});

		/* ---- 공통: 페이드 업 ---- */
		$$("[data-fade]").forEach(function (el) {
			gsap.from(el, {
				y: 36, autoAlpha: 0, duration: 1,
				scrollTrigger: { trigger: el, start: "top 90%", toggleActions: "play none none none" }
			});
		});

		/* ---- 4. 레슨: 설명·버튼 페이드 업 ---- */
		gsap.from(["[data-lesson-text] .lead", "[data-lesson-text] .btn"], {
			y: 30, autoAlpha: 0, stagger: .1,
			scrollTrigger: { trigger: "[data-lesson-text]", start: "top 85%", toggleActions: "play none none none" }
		});

		/* ---- 5. 파트너: 2줄 마퀴(반대 방향) + 스크롤 속도 연동 ---- */
		var marquees = $$("[data-marquee]");
		var loops = marquees.map(function (m, i) {
			var t = $(".marquee__track", m);
			var n = t.children.length;
			t.innerHTML += t.innerHTML; // 이음새 없는 루프를 위해 복제
			for (var k = n; k < t.children.length; k++) t.children[k].setAttribute("aria-hidden", "true");
			var tw = m.dataset.dir === "-1"
				? gsap.fromTo(t, { xPercent: -50 }, { xPercent: 0, ease: "none", duration: 46, repeat: -1 })
				: gsap.to(t, { xPercent: -50, ease: "none", duration: 40, repeat: -1 });
			m.addEventListener("mouseenter", function () { gsap.to(tw, { timeScale: 0, duration: .6, overwrite: true }); });
			m.addEventListener("mouseleave", function () { gsap.to(tw, { timeScale: 1, duration: .6, overwrite: true }); });
			gsap.from(m, {
				autoAlpha: 0, y: 40, delay: i * .12,
				scrollTrigger: { trigger: m, start: "top 95%", toggleActions: "play none none none" }
			});
			return tw;
		});
		ScrollTrigger.create({
			trigger: ".partners", start: "top bottom", end: "bottom top",
			onUpdate: function (self) {
				var v = Math.min(Math.abs(self.getVelocity()) / 350, 6);
				loops.forEach(function (tw) {
					gsap.to(tw, { timeScale: 1 + v, duration: .25, overwrite: true });
					gsap.to(tw, { timeScale: 1, duration: 1.2, delay: .25, overwrite: false });
				});
			}
		});

		/* ---- 6. 인스타: 배경 패럴랙스 ---- */
		gsap.fromTo(".insta__bg", { yPercent: -9 }, {
			yPercent: 9, ease: "none",
			scrollTrigger: { trigger: ".insta", start: "top bottom", end: "bottom top", scrub: true }
		});

		/* ---- 퀵메뉴: 로드 후 우측에서 등장 ---- */
		gsap.from(".quick__item", { x: 40, autoAlpha: 0, duration: .8, stagger: .08, delay: 1.2 });

		return function () {
			// matchMedia revert 시 마퀴 복제 노드 정리
			marquees.forEach(function (m) {
				var t = $(".marquee__track", m);
				var half = t.children.length / 2;
				while (t.children.length > half) t.removeChild(t.lastChild);
			});
		};
	});

	/* 이미지/폰트 로딩 후 위치 재계산 */
	window.addEventListener("load", function () { ScrollTrigger.refresh(); });
	if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();
