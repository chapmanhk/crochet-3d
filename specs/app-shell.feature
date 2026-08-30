@e2e
Feature: App shell
  As a crocheter
  I want to see the pattern designer layout when I open the app
  So that I can start building a pattern

  Background:
    Given I am using the crochet pattern designer

  Scenario: App loads with toolbar, info panel, and 3D canvas
    Then I should see the pattern tools toolbar
    And I should see the pattern information panel
    And I should see the 3D canvas
    And I should see the "New foundation" action

  Scenario: Empty pattern shows guidance
    Given I have no pattern
    Then the pattern status should be "No pattern"
    And I should see guidance to start a foundation chain or magic ring
    And I should see next-step guidance to choose "New foundation" or "Templates"

  Scenario: Skip link focuses the 3D canvas region
    Given I am using the crochet pattern designer
    When I activate the skip to 3D canvas link
    Then the 3D canvas region should be focused

  Scenario: Foundation chain shows next-step guidance
    Given I have a foundation chain of 3
    Then I should see next-step guidance to choose "New Row"

  Scenario: Yarn color picker updates the selected color
    Given I have no pattern
    When I choose the yarn color "#336699"
    Then the yarn color should be "#336699"

  Scenario: First-run onboarding explains how to start a pattern
    Given onboarding has not been seen
    When I open the crochet pattern designer
    Then I should see the onboarding dialog
    When I dismiss the onboarding dialog
    Then the onboarding dialog should be closed

  Scenario: Info panel can be collapsed on narrow viewports
    Given I have a foundation chain of 3
    And the viewport is narrow
    When I hide the info panel
    Then I should see the show panel control
