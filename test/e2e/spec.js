describe('Login page', function()
{
    var form,
        login,
        message,
        submit;

    // by.id instead of by.model in case AngularJs is dropped
    form = element(by.id('loginbox'));
    login = element(by.model('username'));
    submit = element(by.id('submit'));
    message = element(by.id('message'));

    beforeEach(function ()
    {
        browser.get('http://127.0.0.1:30000/index.html');
    });

    describe('Home page', function ()
    {
        it('should have a form', function ()
        {
            expect(form).toBeDefined;
        });

        it('should contain a username field and a submit button', function ()
        {
            expect(login).toBeDefined;
            expect(submit).toBeDefined;
        });

        it('should not be submitted if username is empty', function ()
        {
            login.sendKeys('     ');
            submit.click();

            expect(message.getText()).toContain('Field username cannot be empty');
        });

        it('should navigate to next page when username is valid', function ()
        {
            login.sendKeys('thimpat');
            submit.click();
            expect(browser.getCurrentUrl()).toContain('showData');
        });


    });

});