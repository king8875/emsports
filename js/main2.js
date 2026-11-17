/* =========================================================
   EMSPORTS main (시안 2) — GSAP + ScrollTrigger
   Revolut 메인의 스크롤 구성:
   1) 히어로의 프레임 카드가 올시즌 섹션의 가운데 카드가 되며 양옆 카드가 열림
   2) 풀블리드 사진 섹션(패럴랙스) / 다크 섹션(영상·폰 프레임 상승)
   3) 라이트 2단(엠블럼) / 로고 그리드 / 다크 카드 리스트
   ========================================================= */
(function () {
	"use strict";

	if (!window.gsap || !window.ScrollTrigger) return;
	gsap.registerPlugin(ScrollTrigger);
	ScrollTrigger.config({ ignoreMobileResize: true });
	gsap.defaults({ ease: "power3.out", duration: 1 });

	var $ = function (s, c) { return (c || document).querySelector(s); };
	var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
	var header = $("#header");

	/* ---------------------------------------------------------
	   모바일 메뉴 (모션 설정과 무관)
	   --------------------------------------------------------- */
	(function mobileNav() {
		var burger = $("#burger"), mnav = $("#mnav");
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

	/* 모션 줄이기: 스테이지 연출이 없으므로 히어로를 지난 뒤 헤더를 흰색 바로 전환
	   (모션 사용 시에는 아래 스테이지 트리거가 처리) */
	gsap.matchMedia().add("(prefers-reduced-motion: reduce)", function () {
		ScrollTrigger.create({
			trigger: "#salary", start: "top 72px", end: "max",
			onEnter: function () { header.classList.add("is-solid"); },
			onLeaveBack: function () { header.classList.remove("is-solid"); },
			onRefresh: function (self) { header.classList.toggle("is-solid", self.scroll() >= self.start); }
		});
	});

	/* ---------------------------------------------------------
	   렌탈 섹션 칩: 배경 사진 전환 (모션 설정과 무관)
	   --------------------------------------------------------- */
	(function chips() {
		var bgs = $$(".savings__bg img");
		var btns = $$("[data-chip]");
		btns.forEach(function (b) {
			b.addEventListener("click", function () {
				var i = +b.dataset.chip;
				bgs.forEach(function (img, k) { img.classList.toggle("is-active", k === i); });
				btns.forEach(function (x) {
					var on = x === b;
					x.classList.toggle("is-active", on);
					x.setAttribute("aria-selected", on);
				});
			});
		});
	})();

	/* <br> 기준 줄 마스크 분할 (히어로 타이틀은 마크업에 이미 있음) */
	var mm = gsap.matchMedia();

	mm.add("(prefers-reduced-motion: no-preference)", function () {

		/* =====================================================
		   1+2. 스테이지: 히어로 → 올시즌 (핀 + 스크럽)
		   ===================================================== */
		var stage = $("#stage");
		var heroText = $(".hero__text");
		var row = $(".salary__cards");
		var left = $('[data-pcard="left"]');
		var center = $('[data-pcard="center"]');
		var right = $('[data-pcard="right"]');

		stage.classList.add("is-stage");

		// 로드 연출 없음: 새로고침하면 히어로의 타이틀·카드가 처음부터 바로 보인다.
		// (히어로 배경도 확대하지 않는다: 가운데 카드 속 사진과 위치가 정확히 맞아야 하므로)

		/* Revolut 방식: 스크롤이 시작되면(스크럽 아님) 약 1.3초짜리 전환이 자동 재생된다.
		   - 카드 행 전체가 1.x배에서 1배로 줄어들며(프레임 → 3카드), 양옆 카드는 흐릿한 상태에서 선명해짐
		   - 흰 시트가 아래에서 올라와 히어로를 덮고, 히어로 텍스트는 위로 밀려 사라짐
		   - 맨 위로 되돌아가면 역재생 */
		var tl = null, isOpen = false;

		// 히어로 상태(프레임)에서는 카드 링크를 막고(마우스·키보드·스크린리더), salary 상태에서만 활성화
		function lockCards(locked) {
			stage.classList.toggle("is-open", !locked);   // CSS: 열린 상태에서만 올시즌 레이어가 포인터를 받음
			[left, center, right, $(".salary__text .btn")].forEach(function (a) {
				if (locked) a.setAttribute("tabindex", "-1"); else a.removeAttribute("tabindex");
			});
			row.setAttribute("aria-hidden", locked ? "true" : "false");
		}

		function buildTransition() {
			if (tl) tl.kill();
			var H = stage.clientHeight, W = stage.clientWidth;

			// Revolut처럼 최종 카드 행을 제목 바로 아래(제목 하단 + 간격)에 둔다. 행의 bottom을 거기에 맞춰 계산.
			var titleBottom = $(".salary__text").offsetTop + $(".salary__text").offsetHeight;
			var cardTopWanted = titleBottom + Math.max(20, Math.min(H * .035, 32));
			row.style.bottom = Math.max(24, H - cardTopWanted - center.offsetHeight) + "px";

			// 행의 최종 위치(카드 상단)와 히어로 텍스트 하단으로 시작 y 계산
			var rowBottom = H - parseFloat(getComputedStyle(row).bottom);
			var finalTop = rowBottom - center.offsetHeight;
			var textBottom = heroText.offsetTop + heroText.offsetHeight;
			var gutterPx = parseFloat(getComputedStyle(heroText).paddingLeft) || 0;   // hero__text의 좌우 패딩
			var frameW = W < 768 ? W - gutterPx * 2 : Math.min(W * .5, 360);   // 히어로에서 보이는 프레임 폭
			var S0 = Math.max(1.15, frameW / center.offsetWidth);
			// 프레임 상단 위치: 화면 높이의 약 36%(모바일은 텍스트 바로 아래). 단, salary 제목이 나타날 영역을 카드가 가리지 않도록
			// 제목 하단 아래에서 시작한다.
			var frameTop = Math.max(W < 768 ? Math.max(H * .4, textBottom + 20) : H * .36, titleBottom + 24);
			// 카드는 브라우저 폭이 줄어도 작아지지 않는다. 화면이 좁아져 히어로 텍스트(타이틀·서브)가 카드와 가로로 겹치면 카드를 텍스트 아래로 내린다.
			var cardLeftX = W / 2 - frameW / 2 - 16, htTop = heroText.getBoundingClientRect().top, base = frameTop;
			$$(".hero__title .line__in, .hero__sub", heroText).forEach(function (el) {
				var rg = document.createRange(); rg.selectNodeContents(el);
				var r = rg.getBoundingClientRect();   // 텍스트 실제 폭(변형 y는 heroText 기준으로 상쇄)
				var bottom = heroText.offsetTop + (r.bottom - htTop);
				if (r.right > cardLeftX && bottom > base - 8) frameTop = Math.max(frameTop, bottom + 24);
			});
			var y0 = frameTop - finalTop;

			// 흰 패널 = 가운데 카드의 "바깥쪽 프레임". 카드 크기(+여백)에서 시작해 브라우저 전체로 퍼진다.
			var pad = 4;   // 흰 테두리 두께(화면 px 기준. 카드 확대 배율과 무관하게 항상 얇게)
			var cardW = center.offsetWidth * S0;
			var from = [finalTop + y0 - pad, W / 2 - cardW / 2 - pad, -H * .3, W / 2 - cardW / 2 - pad, 0.056 * center.offsetWidth * S0 + pad]; // top, right, bottom, left, radius (카드 폭의 5.6%를 S0배 확대한 화면 px)
			var panel = { p: 0 };
			var panelEl = $(".salary__bg");
			function drawPanel() {
				var k = 1 - panel.p;
				panelEl.style.clipPath = "inset(" + (from[0] * k).toFixed(1) + "px " + (from[1] * k).toFixed(1) + "px " +
					(from[2] * k).toFixed(1) + "px " + (from[3] * k).toFixed(1) + "px round " + (from[4] * k).toFixed(1) + "px)";
			}
			drawPanel();

			// 가운데 카드 속 사진을 히어로 배경과 같은 사진·같은 위치로 맞춘다(카드가 투명한 창처럼 보임).
			// 카드는 행과 함께 S0배 확대돼 있으므로 로컬 좌표로는 1/S0 크기·역오프셋으로 배치한다.
			var winImg = $(".pcard__bgimg", center);
			winImg.style.width = (W / S0) + "px";
			winImg.style.left = (-(W / 2 - cardW / 2) / S0) + "px";
			winImg.style.top = (-(finalTop + y0) / S0) + "px";
			// 화면이 좁아 프레임 상단이 낮아지면 (H - frameTop)/S0 < 카드 높이가 되어 사진 아래에 빈 공간이 생긴다 → 카드 아래 끝까지 덮도록 높이를 늘린다.
			winImg.style.height = Math.max(H / S0, center.offsetHeight + (finalTop + y0) / S0) + "px";

			// 전환 중 사진 자체도 카드 안에서 조금 더 줄어든다(더 많은 장면이 보이도록).
			// 기준점은 카드 아래쪽 중앙 → 위쪽(스키어 머리 쪽)이 더 드러남. 사진이 카드를 벗어나지 않는 최소 배율을 계산해 제한.
			var chLocal = center.offsetHeight, cxLocal = center.offsetWidth / 2;
			var aLeft = -(W / 2 - cardW / 2) / S0, aTop = -(finalTop + y0) / S0;
			winImg.style.transformOrigin = (cxLocal - aLeft) + "px " + (chLocal - aTop) + "px";
			var kMin = Math.max(chLocal / (chLocal - aTop), cxLocal / (cxLocal - aLeft));
			var kEnd = Math.min(1, Math.max(kMin + .03, .78));

			// 히어로 상태의 카드는 아래로 화면 끝까지 이어진다(카드 밑에 흰 공간이 보이지 않도록).
			// 카드의 clip-path 아랫변을 음수 inset으로 늘려 두었다가, 전환 중 원래 높이로 줄이며 아래 모서리를 둥글게 만든다.
			// 모서리 반경: Revolut 카드는 폭의 약 5.6%(최종 254px 카드 기준 약 14px)이고 카드와 함께 확대·축소되므로
			// 로컬 반경은 카드 폭의 5.6%로 고정한다(히어로에서 확대되면 화면상 약 20px, 최종 약 13px).
			var cardR = 0.056 * center.offsetWidth;
			var tail0 = Math.max(0, (H - frameTop) / S0 - center.offsetHeight + 24);   // 카드 로컬 px
			var cp = { t: 0 };
			function drawCard() {
				var r = cardR, k = 1 - cp.t, rb = (r * cp.t).toFixed(1);
				center.style.clipPath = "inset(0px 0px " + (-tail0 * k).toFixed(1) + "px 0px round " + r.toFixed(1) + "px " + r.toFixed(1) + "px " + rb + "px " + rb + "px)";
			}
			drawCard();

			// 히어로 상태의 카드 내용(service / EMSPORTS + scroll 안내)과 올시즌 상태의 내용(Rental / 장비렌탈 / 버튼 / 칩)
			var heroBody = $(".pcard__body--hero", center), scrollHint = $(".pcard__scroll", center);
			var mainBody = $(".pcard__body--main", center), chip = $(".pcard__chip", center);
			// scroll 안내는 히어로에서 보이는 카드(화면)의 가장 하단에 놓는다. 카드는 S0배 확대돼 있으므로 로컬 px로 환산.
			// 히어로 상태의 텍스트(service + 로고)는 화면에 보이는 카드(프레임 상단~화면 하단)의 세로 중앙에 둔다.
			heroBody.style.top = ((H - frameTop) / S0 / 2) + "px";
			heroBody.style.transform = "translateY(-50%)";
			scrollHint.style.top =((H - frameTop - 26) / S0 - scrollHint.offsetHeight) + "px";

			tl = gsap.timeline({ paused: true, defaults: { ease: "power4.out", duration: 1.3 } });
			tl
				.fromTo(row, { scale: S0, y: y0, transformOrigin: "50% 0%" }, { scale: 1, y: 0 }, 0)
				.fromTo([heroBody, scrollHint], { opacity: 1 }, { opacity: 0, duration: .35, ease: "power2.out" }, 0)
				.fromTo([mainBody, chip], { opacity: 0 }, { opacity: 1, duration: .6, ease: "power1.out" }, .45)
				.fromTo([left, right], { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: 1.1 }, 0)   // 히어로에서는 안 보이고, 스크롤하면 나타남
				.fromTo(panel, { p: 0 }, { p: 1, duration: 1.25, onUpdate: drawPanel }, 0)
				.fromTo(cp, { t: 0 }, { t: 1, duration: 1, ease: "power3.out", onUpdate: drawCard }, 0)
				.fromTo(".salary__text", { autoAlpha: 0 }, { autoAlpha: 1, duration: 1, ease: "power1.out" }, .25)
				// 시작값을 명시한다: 새로고침으로 타임라인이 열린 상태(텍스트 숨김)에서 재생성돼도 역재생 시 원래 상태로 돌아오도록
				.fromTo(heroText, { y: 0, autoAlpha: 1 }, { y: -H * .36, autoAlpha: 0, duration: .9 }, 0)
				// 카드 속 사진은 교체 없이 같은 사진 하나가 카드와 함께 줄어들고, 사진 자체도 추가로 조금 더 축소된다
				.fromTo(winImg, { scale: 1 }, { scale: kEnd, duration: 1.3 }, 0);
			tl.eventCallback("onComplete", function () { lockCards(false); });   // 전환이 끝나야 클릭 가능
			tl.progress(isOpen ? 1 : 0);
			lockCards(!isOpen);
		}
		buildTransition();
		ScrollTrigger.addEventListener("refresh", buildTransition);

		// scroll 안내 화살표: 아래로 살짝 움직이는 반복 애니메이션 (GSAP)
		var hintArrow = $(".pcard__scroll i", center);
		gsap.set(hintArrow, { rotation: 45 });
		gsap.to(hintArrow, { y: 7, duration: .8, repeat: -1, yoyo: true, ease: "sine.inOut" });

		ScrollTrigger.create({
			// 스크롤이 2px만 움직여도 전환 시작(스테이지는 항상 최상단). 전환이 끝난 뒤에도 화면 높이의 70%만큼 더 고정해
			// 올시즌 섹션 상단이 바로 밀려 올라가지 않고 잠시 머물게 한다.
			trigger: stage, start: 2, end: function () { return "+=" + Math.round(window.innerHeight * .7); }, pin: true, invalidateOnRefresh: true,
			onEnter: function () { isOpen = true; tl.timeScale(1).play(); header.classList.add("is-solid"); },
			onLeaveBack: function () { isOpen = false; lockCards(true); tl.timeScale(1.4).reverse(); header.classList.remove("is-solid"); },
			onRefresh: function (self) {
				isOpen = self.scroll() >= self.start;
				header.classList.toggle("is-solid", isOpen);
			}
		});

		/* =====================================================
		   공통 리빌
		   ===================================================== */
		$$("[data-fade]").forEach(function (el) {
			gsap.from(el, {
				autoAlpha: 0, duration: 1.1, ease: "power1.out",
				scrollTrigger: { trigger: el, start: "top 90%", toggleActions: "play none none none" }
			});
		});
		$$(".statement").forEach(function (st) {
			gsap.from(st.children, {
				autoAlpha: 0, duration: 1.1, stagger: .12, ease: "power1.out",
				scrollTrigger: { trigger: st, start: "top 82%", toggleActions: "play none none none" }
			});
		});

		/* =====================================================
		   Revolut 방식: 이후 섹션의 요소는 위치 이동 없이 opacity만 페이드 인
		   ===================================================== */
		// 4. 렌탈: 글래스 카드·칩
		gsap.from(["[data-glass]", ".savings .chips"], {
			autoAlpha: 0, duration: 1.1, stagger: .15, ease: "power1.out",
			scrollTrigger: { trigger: "[data-glass]", start: "top 90%", toggleActions: "play none none none" }
		});
		// 5. 레슨: 영상
		gsap.from("[data-video]", {
			autoAlpha: 0, duration: 1.2, ease: "power1.out",
			scrollTrigger: { trigger: ".lesson__stage", start: "top 85%", toggleActions: "play none none none" }
		});
		// 6. 렌탈 라운지: 폰 프레임 (중앙 → 좌우 순으로)
		gsap.from("[data-phones]", {
			autoAlpha: 0, duration: 1.2, ease: "power1.out",
			scrollTrigger: { trigger: ".phones", start: "top 85%", toggleActions: "play none none none" }
		});
		// 7. 소개: 엠블럼
		gsap.from("[data-emblem]", {
			autoAlpha: 0, duration: 1.2, ease: "power1.out",
			scrollTrigger: { trigger: ".about", start: "top 70%", toggleActions: "play none none none" }
		});

		/* =====================================================
		   8. 파트너 그리드: 로고 순차 등장 (칸은 먼저 보임)
		   ===================================================== */
		gsap.set(".logo-grid img", { opacity: 0 });
		ScrollTrigger.batch(".logo-grid li", {
			start: "top 92%",
			onEnter: function (els) {
				gsap.to(els.map(function (li) { return li.firstElementChild; }), {
					opacity: 1, duration: .9, stagger: .05, ease: "power1.out", overwrite: true, clearProps: "opacity"
				});
			}
		});

		/* =====================================================
		   10. 서비스 안내 카드 순차 등장
		   ===================================================== */
		ScrollTrigger.batch("[data-plan]", {
			start: "top 92%",
			onEnter: function (els) { gsap.from(els, { autoAlpha: 0, duration: 1, stagger: .12, ease: "power1.out", overwrite: true }); }
		});

		return function () {
			stage.classList.remove("is-stage");
			lockCards(false);
			ScrollTrigger.removeEventListener("refresh", buildTransition);
			header.classList.remove("is-solid");
		};
	});

	/* ---------------------------------------------------------
	   렌탈 라운지: 무한 루프 슬라이드 (드래그/스와이프, 가운데 아이템이 가장 높음)
	   --------------------------------------------------------- */
	(function phonesCarousel() {
		var box = $("[data-phones]");
		if (!box) return;
		var items = $$(".phone", box), n = items.length;
		var st = { pos: 2 }, step = 0, startX = 0, startPos = 0, lastX = 0, lastT = 0, vel = 0, dragging = false;

		function wrap(d) { return ((d + n / 2) % n + n) % n - n / 2; }
		function measure() {
			var w = items[0].offsetWidth;
			step = w + Math.max(12, Math.round(w * .06));
		}
		function render() {
			var H = box.clientHeight;
			items.forEach(function (el, i) {
				var d = wrap(i - st.pos), a = Math.abs(d);
				var k = Math.max(.52, 1 - .15 * a);
				el.style.height = Math.round(H * k) + "px";
				el.style.transform = "translate3d(" + (d * step).toFixed(1) + "px,0,0)";
				el.style.opacity = a > n / 2 - .6 ? Math.max(0, (n / 2 - a) / .6) : 1;
			});
		}
		function settle(target) {
			gsap.killTweensOf(st);
			gsap.to(st, { pos: target, duration: .9, ease: "power3.out", onUpdate: render });
		}
		function down(e) {
			if (e.button != null && e.button !== 0) return;
			dragging = true; box.classList.add("is-drag");
			gsap.killTweensOf(st);
			startX = lastX = e.clientX; startPos = st.pos; lastT = performance.now(); vel = 0;
			if (box.setPointerCapture) box.setPointerCapture(e.pointerId);
		}
		function move(e) {
			if (!dragging) return;
			var now = performance.now(), dt = Math.max(1, now - lastT);
			vel = (e.clientX - lastX) / dt; lastX = e.clientX; lastT = now;
			st.pos = startPos - (e.clientX - startX) / step;
			render();
		}
		function up() {
			if (!dragging) return;
			dragging = false; box.classList.remove("is-drag");
			settle(Math.round(st.pos - vel * 400 / step));
		}
		box.addEventListener("pointerdown", down);
		box.addEventListener("pointermove", move);
		box.addEventListener("pointerup", up);
		box.addEventListener("pointercancel", up);
		box.setAttribute("tabindex", "0");
		box.addEventListener("keydown", function (e) {
			if (e.key === "ArrowRight") settle(Math.round(st.pos) - 1);
			if (e.key === "ArrowLeft") settle(Math.round(st.pos) + 1);
		});
		window.addEventListener("resize", function () { measure(); render(); });
		measure(); render();
	})();

	window.addEventListener("load", function () { ScrollTrigger.refresh(); });
	if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();
