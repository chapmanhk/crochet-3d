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
    And I should see the "New Chain" action

  Scenario: Empty pattern shows guidance
    Given I have no pattern
    Then the pattern status should be "No pattern"
    And I should see guidance to "Start with a foundation chain."
