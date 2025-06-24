// On your "Hire" Page Code

import { session } from 'wix-storage';
import { fetch } from 'wix-fetch'; // For calling backend HTTP functions

// --- Configuration ---
const CEO_EMAIL = "ceo@example.com"; // Replace with actual CEO email
const DEV_EMAIL = "dev@example.com"; // Replace with actual Dev email
const CEO_CONTACT_DISPLAY_NAME = "Corey LTS (CEO)";
// const ACTUAL_DEV_CONTACT_NAME = "the Developer"; // No longer directly used in messages

// Training material URLs are removed as they are now on Discord
const LTS_DISCORD_SERVER_INVITE_URL = 'https://discord.gg/yourinvite'; // Replace

let onboardingState = {};

const ONBOARDING_STEPS = [
    'start', 'collect_first_name', 'collect_last_name', 'check_computer_response',
    'ask_bilingual', 'check_bilingual_response', 'ask_languages', 'ask_state',
    'ask_email',
    'final_instructions_pre_contract',
    'awaiting_sign_contract_command',
    'awaiting_adobe_signature_completion',
    // 'provide_training_materials', // REMOVED
    // 'confirm_training_completion', // REMOVED
    'final_welcome_and_discord_link',
    'completed'
];

// --- Helper to call backend HTTP functions ---
async function callBackend(endpoint, payload) {
    const baseUrl = "/_functions"; // Or your site URL if testing locally with wixDev
    try {
        const httpResponse = await fetch(`${baseUrl}/${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (httpResponse.ok) {
            return await httpResponse.json();
        } else {
            const errorBody = await httpResponse.json().catch(() => ({ error: "Failed to parse error from backend" }));
            console.error(`Backend call to ${endpoint} failed: ${httpResponse.status}`, errorBody);
            throw new Error(errorBody.error || `Backend error: ${httpResponse.status}`);
        }
    } catch (err) {
        console.error(`Error calling backend function ${endpoint}:`, err);
        throw err; // Re-throw to be caught by the caller
    }
}

async function sendNotificationToStaff(subject, htmlMessage, recipient) {
    try {
        await callBackend("sendOnboardingNotification", {
            recipientEmail: recipient,
            subject: subject,
            htmlMessage: htmlMessage
        });
        console.log(`Notification attempt to ${recipient} successful for: ${subject}`);
        return true;
    } catch (error) {
        console.error(`Failed to send notification to ${recipient} for ${subject}:`, error);
        $w("#statusText").text = `Error sending notification: ${error.message}. Please inform admin.`;
        $w("#statusText").show();
        return false;
    }
}


$w.onReady(function () {
    const savedState = session.getItem("onboardingState");
    if (savedState) {
        onboardingState = JSON.parse(savedState);
        if (onboardingState.step && onboardingState.step !== 'completed') {
            displayCurrentStep();
        } else {
            startOnboarding();
        }
    } else {
        startOnboarding();
    }

    $w("#sendButton").onClick(async () => {
        const userInput = $w("#userInput").value.trim();
        $w("#userInput").value = "";
        $w("#statusText").text = "";
        $w("#statusText").hide();
        await processUserInput(userInput);
    });

    $w("#userInput").onKeyPress(async (event) => {
        if (event.key === "Enter") {
            const userInput = $w("#userInput").value.trim();
            $w("#userInput").value = "";
            $w("#statusText").text = "";
            $w("#statusText").hide();
            await processUserInput(userInput);
        }
    });
});

function saveState() {
    session.setItem("onboardingState", JSON.stringify(onboardingState));
}

function startOnboarding() {
    onboardingState = {
        step: 'start',
        data: {}
    };
    saveState();
    displayCurrentStep();
}

async function displayCurrentStep(messageOverride = null) { // Made async for notification
    const currentStepName = onboardingState.step;
    let messageContent = "";
    let nextStepInFlow = "";

    console.log(`Displaying step: ${currentStepName}`);

    if (messageOverride) {
        $w("#botMessage").text = messageOverride;
        return;
    }

    switch (currentStepName) {
        case 'start':
            messageContent = "Welcome to the New Hire Onboarding Process!\n" +
                "I'll guide you through the initial steps.\n\n" +
                "Please type your responses in the box below and click 'Send'.\n\n" +
                "Let's start with your name. What is your legal first name?";
            nextStepInFlow = 'collect_first_name';
            break;
        case 'collect_first_name':
            messageContent = "Thank you. And what is your legal last name?";
            nextStepInFlow = 'collect_last_name';
            break;
        case 'collect_last_name':
            messageContent = "1. Do you have a computer or laptop (not an iPad or tablet) and headset that you will be using for work? (Y/N)";
            nextStepInFlow = 'check_computer_response';
            break;
        case 'check_computer_response':
            messageContent = "2. Are you bilingual? (Y/N)";
            nextStepInFlow = 'check_bilingual_response';
            break;
        case 'check_bilingual_response':
            if (onboardingState.data.bilingual) {
                messageContent = "Great! What languages do you speak fluently (besides English, if applicable)?";
                nextStepInFlow = 'ask_languages';
            } else {
                messageContent = "3. In which state are you located?";
                nextStepInFlow = 'ask_state';
            }
            break;
        case 'ask_languages':
            messageContent = "3. In which state are you located?";
            nextStepInFlow = 'ask_state';
            break;
        case 'ask_state':
            messageContent = "4. What is your primary email address? (This is where your contract will be sent)";
            nextStepInFlow = 'ask_email';
            break;
        case 'ask_email':
            messageContent = "4. What is your primary email address? (This is where your contract will be sent)";
            break;
        case 'final_instructions_pre_contract':
            messageContent = "DECLARATION. I hereby declare that the information I am providing is true...\n\n" +
                "To proceed with your Independent Contractor Agreement using Adobe Sign, please type `sign contract`.";
            nextStepInFlow = 'awaiting_sign_contract_command';
            break;
        case 'awaiting_sign_contract_command':
             messageContent = "Please type `sign contract` to proceed or `reset` to start over.";
            break;
        case 'awaiting_adobe_signature_completion':
            messageContent = "Please use the Adobe Sign link provided. Once you have COMPLETED the signing process via Adobe, " +
                             "please return here and type `contract signed`.";
            break;
        // Cases for provide_training_materials and confirm_training_completion are removed

        case 'final_welcome_and_discord_link':
            let finalInstructions = "Welcome aboard officially!\n\n" +
                "Your contract process has been initiated. Here's what's next and key information:\n\n" +
                "1. **Join our Discord Server**: " + LTS_DISCORD_SERVER_INVITE_URL + "\n" +
                "   Once on the server, please locate the channel(s) containing our training materials (e.g., #training-materials, #guides).\n" +
                "   You'll find:\n" +
                "   - Training Manual\n" +
                "   - Training Video\n" +
                "   - Training Recordings\n" +
                "   Please complete these materials at your earliest convenience.\n\n" +
                "2. **Key People**:\n";

            if (CEO_EMAIL && CEO_CONTACT_DISPLAY_NAME) {
                finalInstructions += `- ${CEO_CONTACT_DISPLAY_NAME}: Please await contact from them for your next assignments.\n`;
            }
            finalInstructions += `- Adam Black (Support): Your human contact for project-specific questions and quality control.\n`;
            finalInstructions += `- Samantha: Your Discord training and agent support bot on the main server (if applicable).\n\n`;

            finalInstructions += "This fully concludes your automated onboarding. Welcome officially to the team!";
            messageContent = finalInstructions;

            // Send final notification to staff
            let summary = `User ${onboardingState.data.first_name || 'N/A'} ${onboardingState.data.last_name || 'N/A'} ` +
                          `has completed the automated onboarding process and has been provided with the Discord link and final instructions.\n\n` +
                `Summary of collected information:\n` +
                `--------------------------------------------------\n` +
                `Has Computer/Laptop: ${onboardingState.data.has_computer ? 'Yes' : 'No'}\n` +
                `Bilingual: ${onboardingState.data.bilingual ? 'Yes' : 'No'}\n`;
            if (onboardingState.data.languages) {
                summary += `Languages: ${onboardingState.data.languages}\n`;
            }
            summary += `State: ${onboardingState.data.state || 'N/A'}\n` +
                `Email: ${onboardingState.data.email || 'N/A'}\n` +
                `Contract Process Initiated: Yes (Adobe Agreement ID: ${onboardingState.data.adobe_agreement_id || 'N/A'})\n` +
                `--------------------------------------------------`;

            const finalNotifSubject = `Automated Onboarding Complete: ${onboardingState.data.first_name} ${onboardingState.data.last_name}`;
            if (CEO_EMAIL) await sendNotificationToStaff(finalNotifSubject, `<p>${summary.replace(/\n/g, '<br>')}</p>`, CEO_EMAIL);
            if (DEV_EMAIL) await sendNotificationToStaff(finalNotifSubject, `<p>${summary.replace(/\n/g, '<br>')}</p>`, DEV_EMAIL);

            nextStepInFlow = 'completed';
            break;
        case 'completed':
            messageContent = "Your onboarding is complete! You can close this page or type `reset` to start over.";
            $w("#userInput").disable();
            $w("#sendButton").disable();
            break;
        default:
            messageContent = "Something went wrong. Current step: " + currentStepName + ". Type `reset` to start over.";
    }

    $w("#botMessage").text = messageContent;
    if (nextStepInFlow && onboardingState.step === currentStepName) {
        onboardingState.step = nextStepInFlow;
    }
    saveState();
}

async function processUserInput(input) {
    const processedInput = input.toLowerCase().trim();
    const currentStepName = onboardingState.step;

    if (processedInput === 'reset') {
        startOnboarding();
        $w("#userInput").enable();
        $w("#sendButton").enable();
        return;
    }

    let userMessageForNextStep = null;

    switch (currentStepName) {
        case 'start':
        case 'collect_first_name':
            if (input) {
                onboardingState.data.first_name = input;
                onboardingState.step = 'collect_last_name';
            } else {
                userMessageForNextStep = "Please provide your legal first name.";
            }
            break;
        case 'collect_last_name':
            if (input) {
                onboardingState.data.last_name = input;
                onboardingState.step = 'check_computer_response';
            } else {
                userMessageForNextStep = "Please provide your legal last name.";
            }
            break;
        case 'check_computer_response':
            if (processedInput === 'y') {
                onboardingState.data.has_computer = true;
                onboardingState.step = 'check_bilingual_response';
            } else if (processedInput === 'n') {
                onboardingState.data.has_computer = false;
                userMessageForNextStep = "A computer or laptop is required. Onboarding cannot continue.";
                onboardingState.step = 'completed';
                session.removeItem("onboardingState");
                $w("#userInput").disable();
                $w("#sendButton").disable();
            } else {
                userMessageForNextStep = "Invalid input. Please answer Y or N.";
            }
            break;
        case 'check_bilingual_response':
            if (processedInput === 'y') {
                onboardingState.data.bilingual = true;
                onboardingState.step = 'ask_languages';
            } else if (processedInput === 'n') {
                onboardingState.data.bilingual = false;
                onboardingState.step = 'ask_state';
            } else {
                userMessageForNextStep = "Invalid input. Please answer Y or N.";
            }
            break;
        case 'ask_languages':
            onboardingState.data.languages = input;
            onboardingState.step = 'ask_state';
            break;
        case 'ask_state':
            onboardingState.data.state = input;
            const restrictedStates = ['oregon', 'or', 'washington', 'wa', 'california', 'ca'];
            if (restrictedStates.includes(processedInput)) {
                userMessageForNextStep = "Unfortunately, we cannot proceed with applications from Oregon, Washington, or California at this time.";
                onboardingState.step = 'completed';
                session.removeItem("onboardingState");
                $w("#userInput").disable();
                $w("#sendButton").disable();
            } else {
                onboardingState.step = 'ask_email';
            }
            break;
        case 'ask_email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailRegex.test(input)) {
                onboardingState.data.email = input;
                onboardingState.step = 'final_instructions_pre_contract';
            } else {
                userMessageForNextStep = "That doesn't look like a valid email. Please try again.";
            }
            break;
        case 'awaiting_sign_contract_command':
            if (processedInput === 'sign contract') {
                $w("#statusText").text = "Preparing your contract with Adobe Sign. This may take a moment...";
                $w("#statusText").show();
                $w("#sendButton").disable();
                $w("#userInput").disable();

                try {
                    const agreementName = `Independent Contractor Agreement - ${onboardingState.data.first_name} ${onboardingState.data.last_name} - ${new Date().toISOString().split('T')[0]}`;
                    const adobeResponse = await callBackend("initiateAdobeSignContract", {
                        email: onboardingState.data.email,
                        firstName: onboardingState.data.first_name,
                        lastName: onboardingState.data.last_name,
                        agreementName: agreementName
                    });

                    onboardingState.data.adobe_agreement_id = adobeResponse.agreementId;
                    userMessageForNextStep = "Your Independent Contractor Agreement is ready.\n\n" +
                        `Please click this link to review and sign: ${adobeResponse.signingUrl}\n\n` +
                        "(The link will open in a new tab. If your browser blocks pop-ups, you may need to allow it or copy the link.)\n\n" +
                        "Once you have COMPLETED the signing process via Adobe, please return here and type `contract signed`.";
                    onboardingState.step = 'awaiting_adobe_signature_completion';
                    $w("#statusText").hide();
                } catch (error) {
                    console.error("Adobe Sign error:", error);
                    userMessageForNextStep = `Error preparing contract: ${error.message}. Please contact an administrator or type 'reset' to try again.`;
                    $w("#statusText").text = `Error: ${error.message}`;
                } finally {
                    $w("#sendButton").enable();
                    $w("#userInput").enable();
                }
            } else {
                userMessageForNextStep = "Please type `sign contract` to proceed or `reset` to start over.";
            }
            break;
        case 'awaiting_adobe_signature_completion':
            if (processedInput === 'contract signed') {
                onboardingState.data.contract_process_completed_by_user = true;
                // No specific user message here, displayCurrentStep for the new step will handle it.
                onboardingState.step = 'final_welcome_and_discord_link'; // MODIFIED: Go to final welcome

                const staffNotificationSubject = `Contract Signed: ${onboardingState.data.first_name} ${onboardingState.data.last_name}`;
                const staffNotificationBody = `
                    <p>ALERT: User <b>${onboardingState.data.first_name} ${onboardingState.data.last_name}</b>
                    (Email: ${onboardingState.data.email}) has indicated they have SIGNED the Independent Contractor Agreement.</p>
                    <p>Adobe Agreement ID: ${onboardingState.data.adobe_agreement_id || 'N/A'}</p>
                    <p>Please verify the document status in Adobe Sign. They have now been provided with the Discord link and final instructions.</p>`;
                if (CEO_EMAIL) await sendNotificationToStaff(staffNotificationSubject, staffNotificationBody, CEO_EMAIL);
                if (DEV_EMAIL) await sendNotificationToStaff(staffNotificationSubject, staffNotificationBody, DEV_EMAIL);
            } else {
                userMessageForNextStep = "Please use the Adobe Sign link. Once signed, type `contract signed` back here.";
            }
            break;
        // Case for 'confirm_training_completion' is removed.

        case 'completed':
            userMessageForNextStep = "Your onboarding is already complete. Type `reset` to start over.";
            break;
        default:
             userMessageForNextStep = "I'm a bit confused. Type `reset` to start over. (Current step: " + currentStepName + ")";
    }

    saveState();
    if (userMessageForNextStep) {
        await displayCurrentStep(userMessageForNextStep); // await if it's async
    } else {
        await displayCurrentStep(); // await if it's async
    }
}