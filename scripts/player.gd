extends CharacterBody2D

@export var speed: float = 120.0
@export var water_speed: float = 60.0  # 定稿：进水约 50%

var in_water: bool = false
var facing: String = "s"
var _frames: Dictionary = {}

func _ready() -> void:
	_frames = {
		"s": load("res://art/wizard_s.png"),
		"w": load("res://art/wizard_w.png"),
		"e": load("res://art/wizard_e.png"),
		"n": load("res://art/wizard_n.png"),
	}

func _physics_process(_delta: float) -> void:
	var dir := Vector2.ZERO
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP):
		dir.y -= 1
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN):
		dir.y += 1
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		dir.x -= 1
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		dir.x += 1
	if dir != Vector2.ZERO:
		dir = dir.normalized()
		if abs(dir.x) > abs(dir.y):
			facing = "e" if dir.x > 0 else "w"
		else:
			facing = "s" if dir.y > 0 else "n"
		_apply_frame()
	var spd := water_speed if in_water else speed
	velocity = dir * spd
	move_and_slide()

func _apply_frame() -> void:
	var spr := get_node_or_null("Sprite") as Sprite2D
	if spr == null or not _frames.has(facing):
		return
	var tex: Texture2D = _frames[facing]
	spr.texture = tex
	spr.offset = Vector2(0, -tex.get_height() / 2.0)

func set_in_water(value: bool) -> void:
	in_water = value
