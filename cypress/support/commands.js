// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

import faker from "faker";
import {format as formatDate} from "date-fns";

Cypress.Commands.add("getDtLike", (selector, ...args) => {
	return cy.get(`[data-test*=${selector}]`, ...args);
});

Cypress.Commands.add("loginByXstate", (username, password = 's3cret') => {
	const log = Cypress.log({
		name: "loginbyxstate",
		displayName: "LOGIN BY XSTATE",
		message: [`🔐 Authenticating | ${username}`],
		autoEnd: false,
	});

	cy.intercept("POST", "/login").as("loginUser");
	cy.intercept("GET", "/checkAuth").as("getUserProfile");
	cy.visit("/signin", {log: false}).then(() => {
		log.snapshot("before");
	});

	cy.window({log: false}).then((win) => win.authService.send("LOGIN", {username, password}));

	return cy.wait("@loginUser").then((loginUser) => {
		log.set({
			consoleProps() {
				return {
					username,
					password,
					// @ts-ignore
					userId: loginUser.response.body.user.id,
				};
			},
		});

		log.snapshot("after");
		log.end();
	});
});

Cypress.Commands.add('createBankAccount', (bankName = "Bank", accountNumber = faker.finance.account(10), routingNumber = faker.finance.account(9)) => {
	const log = Cypress.log({
		name: "createBankAccount",
		displayName: "mutation",
		message: ['📜 mutation createBankAccount'],
		autoEnd: false,
	});
	log.snapshot('before')
	const apiGqlURL = `${Cypress.env('apiUrl')}/graphql`
	cy.request("POST", apiGqlURL, {
		query: `mutation createBankAccount ($bankName: String!, $accountNumber: String!,  $routingNumber: String!) {
          createBankAccount(
            bankName: $bankName,
            accountNumber: $accountNumber,
            routingNumber: $routingNumber
          ) {
            id
            uuid
            userId
            bankName
            accountNumber
            routingNumber
            isDeleted
            createdAt
          }
        }`,
		variables: {
			bankName: ` ${bankName} - ${faker.company.companyName()}`,
			accountNumber: accountNumber,
			routingNumber: routingNumber,
		},
	}).then((response) => {
		expect(response.status).to.eq(200);
	});
	log.snapshot('after')
	log.end()
})

Cypress.Commands.add('createNotifications', () => {
	const log = Cypress.log({
		name: "createNotification",
		displayName: "POST",
		message: ['📜 /notifications'],
		autoEnd: false,
	});
	log.snapshot("before")
	cy.request("POST", `${Cypress.env('apiUrl')}/notifications/bulk`, {
		items: [
			{
				type: "payment",
				transactionId: "-jCJOEkLh0J",
				status: "received",
			},
			{
				type: "like",
				transactionId: '-jCJOEkLh0J',
				likeId: "MC54o2D5r9aU",
			},
			{
				type: "comment",
				transactionId: "tsHF6_D5oQ",
				commentId: "K3HLpKcGKDiP",
			},
		],
	}).then((response) => {
		expect(response.status).to.eq(200);
		expect(response.body.results.length).to.equal(3);
		log.snapshot('after')
		log.end()
	});

})

// Stub graphql response
Cypress.Commands.add('stubGQL', (operationName, response, alias = 'stub', options = {
	headers: {
		'access-control-allow-origin': '*',
	},
}) => {
	cy.intercept(
		{
			method: 'POST',
		},
		(request) => {
			const data = response.data;
			if (request.body.hasOwnProperty("query") && request.body.query.includes(operationName)) {
				request.reply({
					...options,
					body: {
						data
					},
				})
			}
		},
	).as(alias)
})

Cypress.Commands.add("pickDateRange", (startDate, endDate) => {
	const log = Cypress.log({
		name: "pickDateRange",
		displayName: "PICK DATE RANGE",
		message: [`🗓 ${startDate.toDateString()} to ${endDate.toDateString()}`],
		// @ts-ignore
		autoEnd: false,
		consoleProps() {
			return {
				startDate,
				endDate,
			};
		},
	});

	const selectDate = (date) => {
		return cy.get(`[data-date='${formatDate(date, "YYYY-MM-DD")}']`).click({force: true});
	};

	// Focus initial viewable date picker range around target start date
	// @ts-ignore: Cypress expects wrapped variable to be a jQuery type
	cy.wrap(startDate.getTime()).then((now) => {
		log.snapshot("before");
		// @ts-ignore
		cy.clock(now, ["Date"]);
	});

	// Open date range picker
	cy.getDtLike("filter-date-range-button").click({force: true});
	cy.get(".Cal__Header__root").should("be.visible");

	// Select date range
	selectDate(startDate);
	selectDate(endDate).then(() => {
		log.snapshot("after");
		log.end();
	});

	cy.get(".Cal__Header__root").should("not.exist");
});
