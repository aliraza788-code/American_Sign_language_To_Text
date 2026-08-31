"""
models/custom_layers.py
========================
Training ke waqt (Kaggle pe) do CUSTOM augmentation-layers khud banayi
gayi thi: RandomColorJitter aur RandomCutout. Ye Keras ki built-in
cheezein NAHI hain.

Jab model file (.keras) save hoti hai, usme in custom classes ka
"naam" bhi save ho jata hai. Model ko WAPAS load karne ke liye Keras
ko in classes ki EXACT WAHI definition chahiye hoti hai -- warna
"Could not locate class" error aata hai.

NOTE: Ye layers sirf TRAINING ke dauran kaam karte hain (jab
training=True ho). Live app mein prediction ke waqt (training=False),
ye kuch nahi karte -- image ko bina chhede pass kar dete hain. Ye
sirf model ko load karne ke liye yahan maujood hain.
"""

import tensorflow as tf


@tf.keras.utils.register_keras_serializable()
class RandomColorJitter(tf.keras.layers.Layer):
    """Training ke dauran hue/saturation ko halka random shift karta
    tha -- alag skin-tones aur lighting ke liye model ko robust banane
    ke liye."""

    def __init__(self, hue_delta=0.03, sat_lower=0.8, sat_upper=1.2, **kwargs):
        super().__init__(**kwargs)
        self.hue_delta = hue_delta
        self.sat_lower = sat_lower
        self.sat_upper = sat_upper

    def call(self, images, training=None):
        if not training:
            return images
        images = tf.image.random_hue(images, self.hue_delta)
        images = tf.image.random_saturation(images, self.sat_lower, self.sat_upper)
        return images

    def get_config(self):
        config = super().get_config()
        config.update({
            "hue_delta": self.hue_delta,
            "sat_lower": self.sat_lower,
            "sat_upper": self.sat_upper,
        })
        return config


@tf.keras.utils.register_keras_serializable()
class RandomCutout(tf.keras.layers.Layer):
    """Training ke dauran image ke ek random chote hisse ko kaala kar
    deta tha (occlusion simulate karne ke liye) -- taake model partial
    hath (jaise frame se bahar ka hissa) pe bhi kaam kar sake."""

    def __init__(self, size_ratio=0.15, **kwargs):
        super().__init__(**kwargs)
        self.size_ratio = size_ratio

    def call(self, images, training=None):
        if not training:
            return images
        h = tf.shape(images)[1]
        w = tf.shape(images)[2]
        cut_h = tf.cast(tf.cast(h, tf.float32) * self.size_ratio, tf.int32)
        cut_w = tf.cast(tf.cast(w, tf.float32) * self.size_ratio, tf.int32)

        def apply_cutout(img):
            y = tf.random.uniform([], 0, h - cut_h, dtype=tf.int32)
            x = tf.random.uniform([], 0, w - cut_w, dtype=tf.int32)
            hole = tf.zeros([cut_h, cut_w, 3], dtype=img.dtype)
            mask = tf.pad(
                hole, [[y, h - cut_h - y], [x, w - cut_w - x], [0, 0]],
                constant_values=1,
            )
            return img * mask

        return tf.map_fn(apply_cutout, images)

    def get_config(self):
        config = super().get_config()
        config.update({"size_ratio": self.size_ratio})
        return config