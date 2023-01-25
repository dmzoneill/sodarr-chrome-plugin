.PHONY: all

all: clean push

SHELL := /bin/bash
CWD := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
version := $(shell grep '"version": ".*"' chrome-plugin/manifest.json | awk -F'"' '{print $$4}')
next := $(shell echo ${version} | awk -F. '/[0-9]+\./{$$NF++;print}' OFS=.)

lint:
	npx standard --fix chrome-plugin/

bump: lint
	sed "s/$(version)/$(next)/" -i chrome-plugin/manifest.json

version: bump
	git add -A
	git commit -a -m "Bump to $(next)"

push: version
	git push -u origin main:main -f
